const { spawn } = require("child_process");
const { Pool } = require("pg");
const { drizzle } = require("drizzle-orm/node-postgres");
const { migrate } = require("drizzle-orm/node-postgres/migrator");

const env = process.env;
const log = (msg) => console.log(`[railway-start] ${msg}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, tries, what) {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (e) {
      if (i >= tries) throw new Error(`${what}: ${e.message}`);
      await sleep(2000);
    }
  }
}

// First boot: sign the admin up through Kan's own API on a side port, with
// sign-up switched on for that process only. Railway's healthcheck hits PORT,
// so the public URL isn't live until the real server starts.
async function createAdmin() {
  const port = "3999";
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["/app/bootstrap.cjs"], {
    env: { ...env, PORT: port, HOSTNAME: "127.0.0.1", NEXT_PUBLIC_DISABLE_SIGN_UP: "false" },
    stdio: "ignore",
  });
  try {
    await waitFor(() => fetch(`${base}/api/auth/ok`).then((r) => { if (!r.ok) throw new Error(r.status); }), 60, "temporary server");
    const r = await fetch(`${base}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: env.NEXT_PUBLIC_BASE_URL },
      body: JSON.stringify({ email: env.KAN_ADMIN_EMAIL, password: env.KAN_ADMIN_PASSWORD, name: "Admin" }),
    });
    log(r.ok ? `admin ${env.KAN_ADMIN_EMAIL} created` : `admin sign-up failed: ${r.status} ${await r.text()}`);
  } finally {
    child.kill();
    await new Promise((r) => (child.exitCode !== null ? r() : child.once("exit", r)));
  }
}

// Card attachments are uploaded straight from the browser with presigned URLs,
// so the bucket has to accept cross-origin PUTs from Kan's URL.
async function allowBrowserUploads() {
  const bucket = env.NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME;
  if (!bucket || !env.S3_ENDPOINT) return;
  const { S3Client, PutBucketCorsCommand } = require(require.resolve("@aws-sdk/client-s3", { paths: ["/app", "/app/apps/web"] }));
  const s3 = new S3Client({ region: env.S3_REGION || "us-east-1", endpoint: env.S3_ENDPOINT, forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY } });
  await s3.send(new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: { CORSRules: [{ AllowedOrigins: [env.NEXT_PUBLIC_BASE_URL], AllowedMethods: ["GET", "PUT", "HEAD"], AllowedHeaders: ["*"], ExposeHeaders: ["ETag"], MaxAgeSeconds: 3600 }] },
  }));
  log(`browser uploads allowed on bucket ${bucket}`);
}

(async () => {
  const pool = new Pool({ connectionString: env.POSTGRES_URL });
  await waitFor(() => pool.query("select 1"), 60, "postgres");
  await migrate(drizzle(pool), { migrationsFolder: "/db/migrations" });
  log("migrations applied");
  const { rows } = await pool.query('select count(*)::int as n from "user"');
  await pool.end();

  if (rows[0].n === 0 && env.KAN_ADMIN_EMAIL && env.KAN_ADMIN_PASSWORD) await createAdmin();
  await allowBrowserUploads().catch((e) => log(`could not set bucket CORS: ${e.message}`));

  require("/app/bootstrap.cjs");
})().catch((e) => {
  console.error(`[railway-start] ${e.stack || e}`);
  process.exit(1);
});
