const fs = require("fs");
const configFile = require("./k6options.json");

const envName = process.argv[2] || "qa"; // only qa is wired up right now
const envPath = `k6.env.${envName}.json`;

if (!fs.existsSync(envPath)) {
    console.error(`❌ Environment file ${envPath} not found.`);
    process.exit(1);
}

// Note: k6.env.<name>.json is a real JSON file, not a .env file - read it
// with JSON.parse (the previous version of this script passed it through
// dotenv.parse, which expects KEY=VALUE lines and silently produced an
// empty/garbage config).
const envConfig = JSON.parse(fs.readFileSync(envPath, "utf-8"));

const config = {
  environment: envName,
  baseUrl: envConfig.REDIRECTURI,
  hubclientId: envConfig.HUBCLIENTID,
  clientSecret: envConfig.CLIENTSECRET,
  tenantId: envConfig.TENANTID,
  orgId: envConfig.ORGID,
  password: envConfig.PASSWORD,
  publicApiUrl: envConfig.PUBLICAPIURL,

  vus: configFile.vus,
  duration: configFile.duration,
  thresholds: configFile.thresholds,
};

fs.writeFileSync("config.json", JSON.stringify(config, null, 2));
console.log(`✅ config.json created for ${envName} environment`);
