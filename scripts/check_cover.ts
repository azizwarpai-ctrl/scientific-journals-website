import { ojsQuery } from "../src/features/ojs/server/ojs-client"

async function main() {
  console.log("Checking issue settings...")
  const issueSettings = await ojsQuery("SELECT DISTINCT setting_name FROM issue_settings WHERE setting_name LIKE '%cover%'")
  console.log("Issue Settings:", JSON.stringify(issueSettings, null, 2))
  
  console.log("Checking issue settings coverImage details...")
  const issueSettingsDetails = await ojsQuery("SELECT * FROM issue_settings WHERE setting_name LIKE '%cover%' LIMIT 5")
  console.log("Issue Settings Details:", JSON.stringify(issueSettingsDetails, null, 2))
  
  console.log("\nChecking publication settings...")
  const pubSettings = await ojsQuery("SELECT DISTINCT setting_name FROM publication_settings WHERE setting_name LIKE '%cover%'")
  console.log("Pub Settings:", JSON.stringify(pubSettings, null, 2))
  
  console.log("Checking publication settings coverImage details...")
  const pubSettingsDetails = await ojsQuery("SELECT * FROM publication_settings WHERE setting_name LIKE '%cover%' LIMIT 5")
  console.log("Pub Settings Details:", JSON.stringify(pubSettingsDetails, null, 2))

}

main().catch(console.error).finally(() => process.exit(0))
