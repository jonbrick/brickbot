#!/usr/bin/env node
/**
 * Generate Year CLI
 * Command-line interface for populating existing Notion pages with year databases and structure
 */

require("dotenv").config();
const inquirer = require("inquirer");
const { createSpinner } = require("../src/utils/cli");
const output = require("../src/utils/output");
const NotionDatabase = require("../src/databases/NotionDatabase");

/**
 * Extract page ID from Notion URL or return ID if already extracted
 * @param {string} url - Notion URL or page ID
 * @returns {string} Page ID (32 chars, no dashes)
 * @throws {Error} If URL format is invalid
 */
function extractPageId(url) {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid Notion URL or page ID");
  }

  // Trim whitespace
  const trimmed = url.trim();

  // If it's already just a 32-char hex ID, return it
  const pageIdPattern = /^[a-f0-9]{32}$/i;
  if (pageIdPattern.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  // Try to extract from URL patterns
  // Pattern 1: https://www.notion.so/workspace/Title-abc123def456...
  // Pattern 2: https://notion.so/Title-abc123def456...
  const urlPatterns = [
    /notion\.so\/[^/]+\/([a-f0-9]{32})/i, // Full URL with workspace
    /notion\.so\/([a-f0-9]{32})/i, // Short URL
  ];

  for (const pattern of urlPatterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
  }

  // If no pattern matches, try to find 32-char hex string anywhere in the input
  const anyMatch = trimmed.match(/[a-f0-9]{32}/i);
  if (anyMatch) {
    return anyMatch[0].toLowerCase();
  }

  throw new Error("Invalid Notion URL or page ID format");
}

/**
 * Extract title from Notion page object
 * @param {Object} page - Notion page object
 * @returns {string} Page title or "Untitled"
 */
function getPageTitle(page) {
  try {
    if (
      page.properties &&
      page.properties.title &&
      page.properties.title.type === "title" &&
      page.properties.title.title &&
      page.properties.title.title.length > 0
    ) {
      const titleText = page.properties.title.title[0]?.plain_text || "";
      return titleText || "Untitled";
    }
  } catch (error) {
    // Fall through to return "Untitled"
  }
  return "Untitled";
}

/**
 * Fetch a Notion page by ID
 * @param {string} pageId - Page ID to fetch
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<Object>} Page object
 * @throws {Error} If page not found or inaccessible
 */
async function fetchPage(pageId, notionClient) {
  try {
    const page = await notionClient.pages.retrieve({
      page_id: pageId,
    });
    return page;
  } catch (error) {
    // Handle specific Notion API errors
    if (error.code === "object_not_found") {
      throw new Error("Page not found");
    }
    if (error.code === "unauthorized" || error.status === 403) {
      throw new Error(
        "Cannot access page. Make sure the integration has access."
      );
    }
    // Generic error
    throw new Error(`Failed to fetch page: ${error.message}`);
  }
}

/**
 * Prompt user for Notion page URL
 * @returns {Promise<string>} URL or page ID string
 */
async function promptForPageUrl() {
  const { url } = await inquirer.prompt([
    {
      type: "input",
      name: "url",
      message: "Paste the Notion URL of your empty year page:",
      validate: (input) => {
        if (!input || !input.trim()) {
          return "Please enter a Notion URL or page ID";
        }
        try {
          extractPageId(input);
          return true;
        } catch (error) {
          return "Invalid Notion URL or page ID format";
        }
      },
    },
  ]);

  return url.trim();
}

/**
 * Extract year from page title (e.g., "2026" from "2026")
 * @param {string} title - Page title
 * @returns {string} Year as 4-digit string
 * @throws {Error} If year cannot be extracted
 */
function extractYearFromTitle(title) {
  const yearMatch = title.match(/\b\d{4}\b/);
  if (!yearMatch) {
    throw new Error(`Could not extract year from page title: "${title}"`);
  }
  return yearMatch[0];
}

/**
 * Create a subpage under the parent page
 * @param {string} parentId - Parent page ID
 * @param {string} title - Subpage title
 * @param {string} icon - Emoji icon
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<string>} Created page ID
 */
async function createSubpage(parentId, title, icon, notionClient) {
  try {
    const response = await notionClient.pages.create({
      parent: { page_id: parentId },
      icon: { type: "emoji", emoji: icon },
      properties: {
        title: [{ type: "text", text: { content: title } }],
      },
    });
    return response.id;
  } catch (error) {
    throw new Error(`Failed to create subpage "${title}": ${error.message}`);
  }
}

/**
 * Check if a database with the given name exists under the parent
 * @param {string} parentId - Parent page ID
 * @param {string} name - Database name
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<boolean>} True if database exists
 */
async function checkDatabaseExists(parentId, name, notionClient) {
  const normalizeId = (id) => id?.replace(/-/g, "").toLowerCase() || "";
  
  try {
    const response = await notionClient.search({
      query: name,
      filter: {
        property: "object",
        value: "database",
      },
    });

    // Check if any result matches parent and title
    return response.results.some((db) => {
      if (db.object !== "database") return false;
      if (!db.parent || db.parent.type !== "page_id") return false;
      if (normalizeId(db.parent.page_id) !== normalizeId(parentId)) return false;
      if (!db.title || db.title.length === 0) return false;
      return db.title[0].plain_text === name;
    });
  } catch (error) {
    // If search fails, assume it doesn't exist (safer to try creating)
    return false;
  }
}

/**
 * Retrieve the source database schema
 * @param {string} databaseId - Source database ID
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<Object>} Properties object from database schema
 */
async function fetchDatabaseSchema(databaseId, notionClient) {
  try {
    const response = await notionClient.databases.retrieve({
      database_id: databaseId,
    });
    return response.properties; // Object mapping property name -> property schema
  } catch (error) {
    throw new Error(
      `Failed to fetch database schema for ${databaseId}: ${error.message}`
    );
  }
}

/**
 * Filter properties to Phase 1 types only
 * @param {Object} properties - Properties object from source database
 * @param {Array<string>} omitList - List of property names to omit
 * @returns {Object} Filtered properties object
 */
function filterPhase1Properties(properties, omitList = []) {
  const phase1Types = [
    "title",
    "rich_text",
    "number",
    "date",
    "checkbox",
    "select",
    "multi_select",
  ];

  const filtered = {};
  for (const [name, prop] of Object.entries(properties)) {
    // Skip if in omit list
    if (omitList.includes(name)) continue;

    // Skip if not Phase 1 type
    if (!phase1Types.includes(prop.type)) continue;

    filtered[name] = prop;
  }

  return filtered;
}

/**
 * Replace "2025" with the year in property names
 * @param {string} name - Property name
 * @param {string} year - Year to replace with
 * @returns {string} Transformed property name
 */
function transformPropertyName(name, year) {
  return name.replace(/2025/g, year);
}

/**
 * Transform a property schema from retrieve format to create format
 * @param {Object} property - Property schema from databases.retrieve()
 * @param {string} year - Year (unused but kept for consistency with plan)
 * @returns {Object} Property schema for databases.create()
 */
function transformPropertyForCreation(property, year) {
  switch (property.type) {
    case "title":
      return { title: {} };

    case "rich_text":
      return { rich_text: {} };

    case "number":
      return { number: {} };

    case "date":
      return { date: {} };

    case "checkbox":
      return { checkbox: {} };

    case "select":
      return {
        select: {
          options: property.select.options.map((opt) => ({
            name: opt.name,
            color: opt.color,
          })),
        },
      };

    case "multi_select":
      return {
        multi_select: {
          options: property.multi_select.options.map((opt) => ({
            name: opt.name,
            color: opt.color,
          })),
        },
      };

    case "status":
      return { status: {} }; // Let Notion create defaults

    default:
      throw new Error(`Unsupported property type: ${property.type}`);
  }
}

/**
 * Create a database with the given properties
 * @param {string} parentId - Parent page ID
 * @param {string} name - Database name
 * @param {string} icon - Emoji icon
 * @param {Object} properties - Properties object for database creation
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<string>} Created database ID
 */
async function createDatabase(parentId, name, icon, properties, notionClient) {
  try {
    const response = await notionClient.databases.create({
      parent: { page_id: parentId },
      icon: { type: "emoji", emoji: icon },
      title: [{ type: "text", text: { content: name } }],
      properties: properties,
    });
    return response.id;
  } catch (error) {
    throw new Error(`Failed to create database "${name}": ${error.message}`);
  }
}

/**
 * Output environment variable assignments
 * @param {Array<Object>} databases - Array of {envVar, id} objects
 * @param {string} year - Year for the comment
 */
function outputEnvVars(databases, year) {
  console.log("\n════════════════════════════════════════════════════════════");
  console.log("📋 Add these to your .env file:");
  console.log(`# ${year} Notion Database IDs`);
  databases.forEach((db) => {
    console.log(`${db.envVar}=${db.id}`);
  });
  console.log("════════════════════════════════════════════════════════════");
}

/**
 * Find the "{year} Databases" subpage if it already exists
 * @param {string} yearPageId - Year page ID
 * @param {string} year - Year string
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<string|null>} Subpage ID if found, null otherwise
 */
async function findDatabasesSubpage(yearPageId, year, notionClient) {
  const normalizeId = (id) => id?.replace(/-/g, "").toLowerCase() || "";
  
  try {
    const subpageTitle = `${year} Databases`;
    const response = await notionClient.search({
      query: subpageTitle,
      filter: {
        property: "object",
        value: "page"
      }
    });
    
    // Find page with matching title and parent
    for (const result of response.results) {
      if (result.object === "page" && 
          result.parent?.type === "page_id" && 
          normalizeId(result.parent.page_id) === normalizeId(yearPageId)) {
        // Get page title to verify exact match
        const pageTitle = getPageTitle(result);
        if (pageTitle === subpageTitle) {
          return result.id;
        }
      }
    }
    
    return null; // Subpage not found
  } catch (error) {
    // If search fails, return null (safer to try creating)
    return null;
  }
}

/**
 * Scan the year page and "Databases" subpage to find all created databases
 * @param {string} pageId - Year page ID
 * @param {string} databasesPageId - Databases subpage ID
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<Object>} Map of database names to IDs
 */
async function scanForDatabases(pageId, databasesPageId, notionClient) {
  const normalizeId = (id) => id?.replace(/-/g, "").toLowerCase() || "";
  const databaseMap = {};
  
  // Search for databases under year page
  try {
    const yearPageResponse = await notionClient.search({
      filter: {
        property: "object",
        value: "database"
      }
    });
    
    for (const result of yearPageResponse.results) {
      if (result.object === "database" && 
          result.parent?.type === "page_id" && 
          normalizeId(result.parent.page_id) === normalizeId(pageId)) {
        const dbName = result.title[0]?.plain_text || "";
        if (dbName) {
          databaseMap[dbName] = result.id;
        }
      }
    }
  } catch (error) {
    throw new Error(`Failed to scan databases under year page: ${error.message}`);
  }
  
  // Search for databases under "Databases" subpage
  try {
    const databasesPageResponse = await notionClient.search({
      filter: {
        property: "object",
        value: "database"
      }
    });
    
    for (const result of databasesPageResponse.results) {
      if (result.object === "database" && 
          result.parent?.type === "page_id" && 
          normalizeId(result.parent.page_id) === normalizeId(databasesPageId)) {
        const dbName = result.title[0]?.plain_text || "";
        if (dbName) {
          databaseMap[dbName] = result.id;
        }
      }
    }
  } catch (error) {
    throw new Error(`Failed to scan databases under Databases subpage: ${error.message}`);
  }
  
  return databaseMap;
}

/**
 * Check if Phase 2 is already complete by verifying a known relation property exists
 * @param {Object} databaseMap - Map of database names to IDs
 * @param {string} year - Year string
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<boolean>} True if Phase 2 is complete
 */
async function checkPhase2Complete(databaseMap, year, notionClient) {
  const weeksDbName = `${year} Weeks`;
  const weeksDbId = databaseMap[weeksDbName];
  
  if (!weeksDbId) {
    return false; // Weeks database doesn't exist, Phase 2 not done
  }
  
  const expectedPropertyName = `🗓️ ${year} Months`;
  
  try {
    const db = await notionClient.databases.retrieve({
      database_id: weeksDbId
    });
    
    // Check if the relation property exists
    if (db.properties[expectedPropertyName]?.type === "relation") {
      return true; // Phase 2 already complete
    }
    
    return false;
  } catch (error) {
    // If we can't check, assume not complete (safer to try)
    return false;
  }
}

/**
 * Check if a relation property with the given name already exists in the database
 * @param {string} databaseId - Database ID
 * @param {string} propertyName - Property name
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<boolean>} True if relation property exists
 */
async function checkRelationExists(databaseId, propertyName, notionClient) {
  try {
    const db = await notionClient.databases.retrieve({
      database_id: databaseId
    });
    
    const property = db.properties[propertyName];
    return property?.type === "relation";
  } catch (error) {
    // If fetch fails, assume it doesn't exist (safer to try creating)
    return false;
  }
}

/**
 * Create a bidirectional relation property using Notion's dual_property API
 * @param {string} sourceDbId - Source database ID
 * @param {string} targetDbId - Target database ID
 * @param {string} sourcePropertyName - Property name on source database
 * @param {string} targetPropertyName - Property name on target database (reverse)
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<void>}
 */
async function createRelation(sourceDbId, targetDbId, sourcePropertyName, targetPropertyName, notionClient) {
  try {
    await notionClient.databases.update({
      database_id: sourceDbId,
      properties: {
        [sourcePropertyName]: {
          relation: {
            database_id: targetDbId,
            dual_property: {
              synced_property_name: targetPropertyName
            }
          }
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to create relation "${sourcePropertyName}": ${error.message}`);
  }
}

/**
 * Main Phase 2 orchestration function
 * @param {string} pageId - Year page ID
 * @param {string} databasesPageId - Databases subpage ID
 * @param {string} year - Year string
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<void>}
 */
async function runPhase2(pageId, databasesPageId, year, notionClient) {
  // Import relation config
  const { RELATION_CONFIG } = require("./generate-year-config");
  
  // Scan for databases
  console.log("🔍 Scanning for database IDs...");
  const databaseMap = await scanForDatabases(pageId, databasesPageId, notionClient);
  console.log(`Found ${Object.keys(databaseMap).length} databases`);
  
  // Check if Phase 2 already complete
  const isComplete = await checkPhase2Complete(databaseMap, year, notionClient);
  if (isComplete) {
    console.log("✅ Phase 2 already complete (relations exist), skipping");
    return;
  }
  
  // Create relations
  console.log("\n🔗 Phase 2: Adding relations...");
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < RELATION_CONFIG.length; i++) {
    const config = RELATION_CONFIG[i];
    const sourceDbName = config.sourceDb.replace("{year}", year);
    const targetDbName = config.targetDb.replace("{year}", year);
    const sourcePropertyName = config.sourcePropertyName.replace("{year}", year);
    const targetPropertyName = config.targetPropertyName.replace("{year}", year);
    
    const sourceDbId = databaseMap[sourceDbName];
    const targetDbId = databaseMap[targetDbName];
    
    // Validate database IDs exist
    if (!sourceDbId) {
      console.error(`[${i + 1}/16] ${sourceDbName} → ${targetDbName} ❌ Source database not found`);
      errorCount++;
      continue;
    }
    
    if (!targetDbId) {
      console.error(`[${i + 1}/16] ${sourceDbName} → ${targetDbName} ❌ Target database not found`);
      errorCount++;
      continue;
    }
    
    try {
      // Check if relation already exists
      const exists = await checkRelationExists(sourceDbId, sourcePropertyName, notionClient);
      if (exists) {
        console.log(`[${i + 1}/16] ${sourceDbName} → ${targetDbName} ⏭️  (already exists)`);
        skipCount++;
        continue;
      }
      
      // Create relation
      await createRelation(
        sourceDbId,
        targetDbId,
        sourcePropertyName,
        targetPropertyName,
        notionClient
      );
      
      console.log(`[${i + 1}/16] ${sourceDbName} → ${targetDbName} ✅`);
      successCount++;
      
      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`[${i + 1}/16] ${sourceDbName} → ${targetDbName} ❌ Error: ${error.message}`);
      errorCount++;
      // Continue with next relation
    }
  }
  
  // Output results
  console.log("\n════════════════════════════════════════════════════════════");
  console.log(`✅ Phase 2 Complete: ${successCount} relations added, ${skipCount} skipped, ${errorCount} errors`);
  console.log(`   (${successCount * 2} columns created via bidirectional linking)`);
  console.log("════════════════════════════════════════════════════════════");
}

/**
 * Check if Phase 3 is already complete by verifying a known formula or rollup property exists
 * @param {Object} databaseMap - Map of database names to IDs
 * @param {string} year - Year string
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<boolean>} True if Phase 3 is complete
 */
async function checkPhase3Complete(databaseMap, year, notionClient) {
  const weeksDbName = `${year} Weeks`;
  const weeksDbId = databaseMap[weeksDbName];
  
  if (!weeksDbId) {
    return false; // Weeks database doesn't exist, Phase 3 not done
  }
  
  try {
    const db = await notionClient.databases.retrieve({
      database_id: weeksDbId
    });
    
    // Check if any formula or rollup property exists
    for (const [propName, prop] of Object.entries(db.properties)) {
      if (prop.type === "formula" || prop.type === "rollup") {
        return true; // Phase 3 already complete
      }
    }
    
    return false;
  } catch (error) {
    // If we can't check, assume not complete (safer to try)
    return false;
  }
}

/**
 * Fetch formula and rollup properties from the source database schema
 * @param {string} sourceId - Source database ID
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<Object>} Object mapping property names to property schemas
 */
async function fetchFormulaAndRollupProperties(sourceId, notionClient) {
  try {
    const response = await notionClient.databases.retrieve({
      database_id: sourceId
    });
    
    const formulaRollupProps = {};
    for (const [name, prop] of Object.entries(response.properties)) {
      if (prop.type === "formula" || prop.type === "rollup") {
        formulaRollupProps[name] = prop;
      }
    }
    
    return formulaRollupProps;
  } catch (error) {
    throw new Error(`Failed to fetch formula/rollup properties from source ${sourceId}: ${error.message}`);
  }
}

/**
 * Transform a formula expression by replacing "2025" with the year in property references
 * @param {string} expression - Formula expression
 * @param {string} year - Year string
 * @returns {string} Transformed expression
 */
function transformFormulaExpression(expression, year) {
  // Replace "2025" with year in property names
  // This handles cases like: prop("2025 Weeks") -> prop("2026 Weeks")
  // Uses regex to match prop("...") and replace 2025 inside quotes
  return expression.replace(/prop\("([^"]*2025[^"]*)"\)/g, (match, propName) => {
    const newPropName = propName.replace(/2025/g, year);
    return `prop("${newPropName}")`;
  });
}

/**
 * Transform rollup configuration by replacing "2025" with year in property names
 * @param {Object} rollup - Rollup configuration object
 * @param {string} year - Year string
 * @returns {Object} Transformed rollup configuration
 */
function transformRollupConfig(rollup, year) {
  return {
    relation_property_name: rollup.relation_property_name.replace(/2025/g, year),
    rollup_property_name: rollup.rollup_property_name.replace(/2025/g, year),
    function: rollup.function // Unchanged
  };
}

/**
 * Add a single property (formula or rollup) to a database
 * @param {string} dbId - Database ID
 * @param {string} propertyName - Property name
 * @param {Object} propertyConfig - Property configuration
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<void>}
 */
async function addPropertyToDatabase(dbId, propertyName, propertyConfig, notionClient) {
  try {
    await notionClient.databases.update({
      database_id: dbId,
      properties: {
        [propertyName]: propertyConfig
      }
    });
  } catch (error) {
    throw new Error(`Failed to add property "${propertyName}": ${error.message}`);
  }
}

/**
 * Main Phase 3 orchestration function
 * @param {string} pageId - Year page ID
 * @param {string} databasesPageId - Databases subpage ID
 * @param {string} year - Year string
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<void>}
 */
async function runPhase3(pageId, databasesPageId, year, notionClient) {
  // Import configs
  const { DATABASE_CONFIG } = require("./generate-year-config");
  
  // Scan for databases
  console.log("🔍 Scanning for database IDs...");
  const databaseMap = await scanForDatabases(pageId, databasesPageId, notionClient);
  console.log(`Found ${Object.keys(databaseMap).length} databases`);
  
  // Check if Phase 3 already complete
  const isComplete = await checkPhase3Complete(databaseMap, year, notionClient);
  if (isComplete) {
    console.log("✅ Phase 3 already complete (formulas/rollups exist), skipping");
    return;
  }
  
  // Add formulas and rollups
  console.log("\n🧮 Phase 3: Adding formulas and rollups...");
  let totalProperties = 0;
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const config of DATABASE_CONFIG) {
    const dbName = config.name.replace("{year}", year);
    const dbId = databaseMap[dbName];
    
    if (!dbId) {
      console.error(`❌ Database "${dbName}" not found, skipping`);
      errorCount++;
      continue;
    }
    
    try {
      // Fetch formula/rollup properties from source
      const sourceProps = await fetchFormulaAndRollupProperties(config.sourceId, notionClient);
      
      if (Object.keys(sourceProps).length === 0) {
        // No formulas/rollups for this database
        continue;
      }
      
      // Fetch current database schema once (for idempotency checks)
      const db = await notionClient.databases.retrieve({ database_id: dbId });
      
      // Process each property
      for (const [sourcePropName, sourceProp] of Object.entries(sourceProps)) {
        totalProperties++;
        const newPropName = sourcePropName.replace(/2025/g, year);
        
        // Check if property already exists
        if (db.properties[newPropName]) {
          skipCount++;
          continue; // Property already exists
        }
        
        // Transform property config based on type
        let propertyConfig;
        if (sourceProp.type === "formula") {
          const transformedExpression = transformFormulaExpression(
            sourceProp.formula.expression,
            year
          );
          propertyConfig = {
            formula: {
              expression: transformedExpression
            }
          };
        } else if (sourceProp.type === "rollup") {
          const transformedRollup = transformRollupConfig(sourceProp.rollup, year);
          propertyConfig = {
            rollup: transformedRollup
          };
        } else {
          continue; // Skip unknown types
        }
        
        // Add property
        await addPropertyToDatabase(dbId, newPropName, propertyConfig, notionClient);
        successCount++;
        
        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`❌ Error processing "${dbName}": ${error.message}`);
      errorCount++;
      // Continue with next database
    }
  }
  
  // Output results
  console.log("\n════════════════════════════════════════════════════════════");
  console.log(`✅ Phase 3 Complete: ${successCount} properties added, ${skipCount} skipped, ${errorCount} errors`);
  console.log("════════════════════════════════════════════════════════════");
}

/**
 * Check if Phase 4 is already complete by checking Weeks database row count
 * @param {string} weeksDbId Weeks database ID
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<boolean>} True if Phase 4 is complete
 */
async function checkPhase4Complete(weeksDbId, notionClient) {
  if (!weeksDbId) {
    return false; // Weeks database doesn't exist, Phase 4 not done
  }
  
  try {
    // Query all weeks (no filter)
    const response = await notionClient.databases.query({
      database_id: weeksDbId
    });
    
    // Check if we have 52 or more rows (some years have 53 weeks)
    return response.results.length >= 52;
  } catch (error) {
    // If query fails, assume not complete (safer to try)
    return false;
  }
}

/**
 * Format date as YYYY-MM-DD for Notion API
 * @param {Date} date - Date object
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
function formatDateForNotion(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculate all weeks for a given year using Google Calendar week numbering
 * @param {number} year - Year number
 * @returns {Array<Object>} Array of {title, startDate, endDate} objects
 */
function calculateWeeksForYear(year) {
  const weeks = [];
  
  // Get January 1st of the year
  const jan1 = new Date(year, 0, 1); // Month 0 = January
  const dayOfWeek = jan1.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  
  // Find the Sunday of the week containing Jan 1st
  // If Jan 1 is Sunday (dayOfWeek === 0), weekStart is Jan 1
  // Otherwise, subtract days to get to the previous Sunday
  const daysToSubtract = dayOfWeek; // 0 for Sunday, 1 for Monday, etc.
  const week1Start = new Date(jan1);
  week1Start.setDate(jan1.getDate() - daysToSubtract);
  
  let currentWeekStart = new Date(week1Start);
  let weekNumber = 1;
  const dec31 = new Date(year, 11, 31); // Month 11 = December
  
  // Generate weeks until we've covered Dec 31st
  while (currentWeekStart <= dec31) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 6); // Saturday
    
    // Only include weeks that overlap with the year (at least one day in the year)
    if (weekEnd >= jan1) {
      const title = `Week ${String(weekNumber).padStart(2, "0")}`;
      const startDateStr = formatDateForNotion(currentWeekStart);
      const endDateStr = formatDateForNotion(weekEnd);
      
      weeks.push({
        title,
        startDate: startDateStr,
        endDate: endDateStr
      });
      
      weekNumber++;
    }
    
    // Move to next week (next Sunday)
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }
  
  return weeks;
}

/**
 * Calculate month titles for a given year
 * @param {string} year - Year string (unused but kept for consistency)
 * @returns {Array<Object>} Array of {title} objects
 */
function calculateMonthsForYear(year) {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  
  return monthNames.map(title => ({ title }));
}

/**
 * Check if a row with the given title already exists in the database
 * @param {string} dbId - Database ID
 * @param {string} titlePropertyName - Title property name
 * @param {string} titleValue - Title value to search for
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<Object|null>} Existing page or null
 */
async function findExistingRow(dbId, titlePropertyName, titleValue, notionClient) {
  try {
    const response = await notionClient.databases.query({
      database_id: dbId,
      filter: {
        property: titlePropertyName,
        title: {
          equals: titleValue
        }
      }
    });
    
    return response.results.length > 0 ? response.results[0] : null;
  } catch (error) {
    // If query fails, assume it doesn't exist (safer to try creating)
    return null;
  }
}

/**
 * Get the date property name from source Weeks database schema
 * @param {string} sourceWeeksDbId - Source Weeks database ID
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<string>} Date property name
 */
async function getWeeksDatePropertyName(sourceWeeksDbId, notionClient) {
  try {
    const db = await notionClient.databases.retrieve({
      database_id: sourceWeeksDbId
    });
    
    // Find the date property
    for (const [propName, prop] of Object.entries(db.properties)) {
      if (prop.type === "date") {
        return propName;
      }
    }
    
    // Fallback to default if not found
    return "Date Range (SET)";
  } catch (error) {
    // Fallback to default if fetch fails
    return "Date Range (SET)";
  }
}

/**
 * Create a single week row in the Weeks database
 * @param {string} dbId - Database ID
 * @param {Object} week - Week object with title, startDate, endDate
 * @param {string} datePropertyName - Date property name
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<void>}
 */
async function createWeekRow(dbId, week, datePropertyName, notionClient) {
  try {
    await notionClient.pages.create({
      parent: { database_id: dbId },
      properties: {
        "Week": {
          title: [{ text: { content: week.title } }]
        },
        [datePropertyName]: {
          date: {
            start: week.startDate,
            end: week.endDate
          }
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to create week row "${week.title}": ${error.message}`);
  }
}

/**
 * Create a single month row in the Months database
 * @param {string} dbId - Database ID
 * @param {Object} month - Month object with title
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<void>}
 */
async function createMonthRow(dbId, month, notionClient) {
  try {
    await notionClient.pages.create({
      parent: { database_id: dbId },
      properties: {
        "Month": {
          title: [{ text: { content: month.title } }]
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to create month row "${month.title}": ${error.message}`);
  }
}

/**
 * Format date for display (e.g., "Jan 4" from "2026-01-04")
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {string} Formatted date string
 */
function formatDateDisplay(dateStr) {
  const [year, month, day] = dateStr.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIndex = parseInt(month, 10) - 1;
  return `${monthNames[monthIndex]} ${parseInt(day, 10)}`;
}

/**
 * Main Phase 4 orchestration function
 * @param {string} pageId - Year page ID
 * @param {string} databasesPageId - Databases subpage ID
 * @param {string} year - Year string
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<void>}
 */
async function runPhase4(pageId, databasesPageId, year, notionClient) {
  // Import configs
  const { DATABASE_CONFIG } = require("./generate-year-config");
  
  // Scan for databases
  console.log("🔍 Scanning for database IDs...");
  const databaseMap = await scanForDatabases(pageId, databasesPageId, notionClient);
  console.log(`Found ${Object.keys(databaseMap).length} databases`);
  
  const weeksDbName = `${year} Weeks`;
  const monthsDbName = `${year} Months`;
  const weeksDbId = databaseMap[weeksDbName];
  const monthsDbId = databaseMap[monthsDbName];
  
  if (!weeksDbId) {
    throw new Error(`Weeks database "${weeksDbName}" not found`);
  }
  
  if (!monthsDbId) {
    throw new Error(`Months database "${monthsDbName}" not found`);
  }
  
  // Check if Phase 4 already complete
  const isComplete = await checkPhase4Complete(weeksDbId, notionClient);
  if (isComplete) {
    console.log("✅ Phase 4 already complete (Weeks populated), skipping");
    return;
  }
  
  console.log("\n📅 Phase 4: Populating Weeks and Months...");
  
  // Get source Weeks database ID for date property name discovery
  const weeksConfig = DATABASE_CONFIG.find(config => config.name === "{year} Weeks");
  const sourceWeeksDbId = weeksConfig?.sourceId;
  const datePropertyName = sourceWeeksDbId 
    ? await getWeeksDatePropertyName(sourceWeeksDbId, notionClient)
    : "Date Range (SET)";
  
  // Create Months
  console.log("\nCreating Months...");
  const monthTitles = calculateMonthsForYear(year);
  let monthSuccessCount = 0;
  let monthSkipCount = 0;
  let monthErrorCount = 0;
  
  for (let i = 0; i < monthTitles.length; i++) {
    const month = monthTitles[i];
    
    try {
      // Check if month already exists
      const existing = await findExistingRow(monthsDbId, "Month", month.title, notionClient);
      if (existing) {
        console.log(`[${i + 1}/12] ${month.title} ⏭️  (already exists)`);
        monthSkipCount++;
        continue;
      }
      
      // Create month row
      await createMonthRow(monthsDbId, month, notionClient);
      console.log(`[${i + 1}/12] ${month.title} ✅`);
      monthSuccessCount++;
      
      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`[${i + 1}/12] ${month.title} ❌ Error: ${error.message}`);
      monthErrorCount++;
      // Continue with next month
    }
  }
  
  // Create Weeks
  console.log("\nCreating Weeks...");
  const weeks = calculateWeeksForYear(parseInt(year, 10));
  let weekSuccessCount = 0;
  let weekSkipCount = 0;
  let weekErrorCount = 0;
  
  for (let i = 0; i < weeks.length; i++) {
    const week = weeks[i];
    
    try {
      // Check if week already exists
      const existing = await findExistingRow(weeksDbId, "Week", week.title, notionClient);
      if (existing) {
        console.log(`[${i + 1}/${weeks.length}] ${week.title} ⏭️  (already exists)`);
        weekSkipCount++;
        continue;
      }
      
      // Create week row
      await createWeekRow(weeksDbId, week, datePropertyName, notionClient);
      console.log(`[${i + 1}/${weeks.length}] ${week.title} (${formatDateDisplay(week.startDate)} - ${formatDateDisplay(week.endDate)}) ✅`);
      weekSuccessCount++;
      
      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`[${i + 1}/${weeks.length}] ${week.title} ❌ Error: ${error.message}`);
      weekErrorCount++;
      // Continue with next week
    }
  }
  
  // Output results
  console.log("\n════════════════════════════════════════════════════════════");
  console.log(`✅ Phase 4 Complete: ${monthSuccessCount} months created, ${weekSuccessCount} weeks created`);
  console.log(`   (${monthSkipCount} months skipped, ${weekSkipCount} weeks skipped)`);
  if (monthErrorCount > 0 || weekErrorCount > 0) {
    console.log(`   (${monthErrorCount} month errors, ${weekErrorCount} week errors)`);
  }
  console.log("════════════════════════════════════════════════════════════");
}

/**
 * Check if Phase 5 is already complete by checking if Week 01 has a Month relation set
 * @param {string} weeksDbId Weeks database ID
 * @param {string} relationPropertyName - Relation property name
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<boolean>} True if Phase 5 is complete
 */
async function checkPhase5Complete(weeksDbId, relationPropertyName, notionClient) {
  if (!weeksDbId) {
    return false;
  }
  
  try {
    // Query for Week 01
    const response = await notionClient.databases.query({
      database_id: weeksDbId,
      filter: {
        property: "Week",
        title: {
          equals: "Week 01"
        }
      }
    });
    
    if (response.results.length === 0) {
      return false; // Week 01 doesn't exist yet
    }
    
    const week01 = response.results[0];
    const relationProperty = week01.properties[relationPropertyName];
    
    // Check if relation property exists and has at least one relation
    return relationProperty?.type === "relation" && 
           relationProperty.relation?.length > 0;
  } catch (error) {
    return false; // Assume not complete if query fails
  }
}

/**
 * Fetch all week rows with their titles, dates, and page IDs
 * @param {string} weeksDbId Weeks database ID
 * @param {string} datePropertyName - Date property name
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<Array>} Array of {pageId, title, startDate, endDate} objects
 */
async function getWeekRows(weeksDbId, datePropertyName, notionClient) {
  try {
    const response = await notionClient.databases.query({
      database_id: weeksDbId
    });
    
    const weeks = [];
    for (const page of response.results) {
      // Extract title
      const titleProp = page.properties["Week"];
      const title = titleProp?.title?.[0]?.plain_text || "";
      
      // Extract date range
      const dateProp = page.properties[datePropertyName];
      if (!dateProp || dateProp.type !== "date" || !dateProp.date) {
        continue; // Skip weeks without date property
      }
      
      const startDate = dateProp.date.start?.split("T")[0] || null; // YYYY-MM-DD
      const endDate = dateProp.date.end?.split("T")[0] || dateProp.date.start?.split("T")[0] || null;
      
      if (!startDate || !endDate) {
        continue; // Skip weeks with invalid dates
      }
      
      weeks.push({
        pageId: page.id,
        title,
        startDate,
        endDate
      });
    }
    
    // Sort by title (Week 01, Week 02, etc.)
    weeks.sort((a, b) => {
      const numA = parseInt(a.title.match(/\d+/)?.[0] || "0", 10);
      const numB = parseInt(b.title.match(/\d+/)?.[0] || "0", 10);
      return numA - numB;
    });
    
    return weeks;
  } catch (error) {
    throw new Error(`Failed to fetch week rows: ${error.message}`);
  }
}

/**
 * Fetch all month rows and build a map from month name to page ID
 * @param {string} monthsDbId Months database ID
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<Object>} Object mapping month name (e.g., "January") to page ID
 */
async function getMonthRows(monthsDbId, notionClient) {
  try {
    const response = await notionClient.databases.query({
      database_id: monthsDbId
    });
    
    const monthMap = {};
    for (const page of response.results) {
      // Extract month title
      const titleProp = page.properties["Month"];
      const monthName = titleProp?.title?.[0]?.plain_text || "";
      
      if (monthName) {
        monthMap[monthName] = page.id;
      }
    }
    
    return monthMap;
  } catch (error) {
    throw new Error(`Failed to fetch month rows: ${error.message}`);
  }
}

/**
 * Determine which month a week belongs to based on the assignment rule
 * @param {string} weekStartDate - ISO date string (YYYY-MM-DD)
 * @param {string} weekEndDate - ISO date string (YYYY-MM-DD)
 * @param {number} year - Year number
 * @returns {string} Month name (e.g., "January", "February")
 */
function determineMonthForWeek(weekStartDate, weekEndDate, year) {
  const startDate = new Date(weekStartDate + "T00:00:00");
  const endDate = new Date(weekEndDate + "T00:00:00");
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Check if week contains the 1st of any month
  for (let month = 0; month < 12; month++) {
    const firstOfMonth = new Date(year, month, 1);
    
    // Check if first of month falls within week range
    if (firstOfMonth >= startDate && firstOfMonth <= endDate) {
      return monthNames[month];
    }
  }
  
  // Otherwise, use the month of the week's start date
  return monthNames[startDate.getMonth()];
}

/**
 * Update a week row's relation property to link to a month
 * @param {string} weekPageId - Week page ID
 * @param {string} monthPageId - Month page ID
 * @param {string} relationPropertyName - Relation property name
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<void>}
 */
async function updateWeekMonth(weekPageId, monthPageId, relationPropertyName, notionClient) {
  try {
    await notionClient.pages.update({
      page_id: weekPageId,
      properties: {
        [relationPropertyName]: {
          relation: [
            { id: monthPageId }
          ]
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to update week-month relation: ${error.message}`);
  }
}

/**
 * Main Phase 5 orchestration function
 * @param {string} pageId - Year page ID
 * @param {string} databasesPageId - Databases subpage ID
 * @param {string} year - Year string
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<void>}
 */
async function runPhase5(pageId, databasesPageId, year, notionClient) {
  // Import configs
  const { DATABASE_CONFIG, RELATION_CONFIG } = require("./generate-year-config");
  
  // Scan for databases
  console.log("🔍 Scanning for database IDs...");
  const databaseMap = await scanForDatabases(pageId, databasesPageId, notionClient);
  console.log(`Found ${Object.keys(databaseMap).length} databases`);
  
  const weeksDbName = `${year} Weeks`;
  const monthsDbName = `${year} Months`;
  const weeksDbId = databaseMap[weeksDbName];
  const monthsDbId = databaseMap[monthsDbName];
  
  if (!weeksDbId) {
    throw new Error(`Weeks database "${weeksDbName}" not found`);
  }
  
  if (!monthsDbId) {
    throw new Error(`Months database "${monthsDbName}" not found`);
  }
  
  // Get relation property name from RELATION_CONFIG
  const weeksToMonthsRelation = RELATION_CONFIG.find(
    config => config.sourceDb === "{year} Weeks" && config.targetDb === "{year} Months"
  );
  
  if (!weeksToMonthsRelation) {
    throw new Error("Weeks to Months relation config not found");
  }
  
  const relationPropertyName = weeksToMonthsRelation.sourcePropertyName.replace("{year}", year);
  
  // Check if Phase 5 already complete
  const isComplete = await checkPhase5Complete(weeksDbId, relationPropertyName, notionClient);
  if (isComplete) {
    console.log("✅ Phase 5 already complete (Week 01 has month relation), skipping");
    return;
  }
  
  console.log("\n🔗 Phase 5: Wiring Weeks to Months...");
  
  // Get date property name for Weeks (reuse Phase 4 logic)
  const weeksConfig = DATABASE_CONFIG.find(config => config.name === "{year} Weeks");
  const sourceWeeksDbId = weeksConfig?.sourceId;
  const datePropertyName = sourceWeeksDbId 
    ? await getWeeksDatePropertyName(sourceWeeksDbId, notionClient)
    : "Date Range (SET)";
  
  // Fetch month rows
  console.log("📅 Fetching month rows...");
  const monthMap = await getMonthRows(monthsDbId, notionClient);
  console.log(`Found ${Object.keys(monthMap).length} months`);
  
  // Fetch week rows
  console.log("⏰ Fetching week rows...");
  const weekRows = await getWeekRows(weeksDbId, datePropertyName, notionClient);
  console.log(`Found ${weekRows.length} weeks`);
  
  // Update each week
  console.log("\nLinking weeks to months...");
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < weekRows.length; i++) {
    const week = weekRows[i];
    
    try {
      // Determine which month this week belongs to
      const monthName = determineMonthForWeek(
        week.startDate,
        week.endDate,
        parseInt(year, 10)
      );
      
      const monthPageId = monthMap[monthName];
      if (!monthPageId) {
        console.error(`[${i + 1}/${weekRows.length}] ${week.title} ❌ Month "${monthName}" not found`);
        errorCount++;
        continue;
      }
      
      // Check if relation already exists (idempotency)
      const weekPage = await notionClient.pages.retrieve({ page_id: week.pageId });
      const existingRelation = weekPage.properties[relationPropertyName]?.relation || [];
      const alreadyLinked = existingRelation.some(rel => rel.id === monthPageId);
      
      if (alreadyLinked) {
        console.log(`[${i + 1}/${weekRows.length}] ${week.title} → ${monthName} ⏭️  (already linked)`);
        skipCount++;
        continue;
      }
      
      // Update week's relation property
      await updateWeekMonth(week.pageId, monthPageId, relationPropertyName, notionClient);
      console.log(`[${i + 1}/${weekRows.length}] ${week.title} → ${monthName} ✅`);
      successCount++;
      
      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`[${i + 1}/${weekRows.length}] ${week.title} ❌ Error: ${error.message}`);
      errorCount++;
      // Continue with next week
    }
  }
  
  // Output results
  console.log("\n════════════════════════════════════════════════════════════");
  console.log(`✅ Phase 5 Complete: ${successCount} weeks linked, ${skipCount} skipped, ${errorCount} errors`);
  console.log("════════════════════════════════════════════════════════════");
}

/**
 * Fix schema gaps by adding missing relations
 * @param {Object} databaseMap - Map of database names to IDs
 * @param {string} year - Year string
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<void>}
 */
async function fixSchemaGaps(databaseMap, year, notionClient) {
  const { RELATION_CONFIG } = require("./generate-year-config");
  
  // Get the 2 new relations that need to be created
  const newRelations = RELATION_CONFIG.filter(
    config => 
      (config.sourceDb === "{year} Year" && config.targetDb === "{year} Months") ||
      (config.sourceDb === "{year} Trips" && config.targetDb === "{year} Events")
  );
  
  console.log("\n🔧 Phase 6a: Fixing schema gaps...");
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < newRelations.length; i++) {
    const config = newRelations[i];
    const sourceDbName = config.sourceDb.replace("{year}", year);
    const targetDbName = config.targetDb.replace("{year}", year);
    const sourcePropertyName = config.sourcePropertyName.replace("{year}", year);
    const targetPropertyName = config.targetPropertyName.replace("{year}", year);
    
    const sourceDbId = databaseMap[sourceDbName];
    const targetDbId = databaseMap[targetDbName];
    
    // Validate database IDs exist
    if (!sourceDbId) {
      console.error(`[${i + 1}/${newRelations.length}] ${sourceDbName} → ${targetDbName} ❌ Source database not found`);
      errorCount++;
      continue;
    }
    
    if (!targetDbId) {
      console.error(`[${i + 1}/${newRelations.length}] ${sourceDbName} → ${targetDbName} ❌ Target database not found`);
      errorCount++;
      continue;
    }
    
    try {
      // Check if relation already exists
      const exists = await checkRelationExists(sourceDbId, sourcePropertyName, notionClient);
      if (exists) {
        console.log(`[${i + 1}/${newRelations.length}] ${sourceDbName} → ${targetDbName} ⏭️  (already exists)`);
        skipCount++;
        continue;
      }
      
      // Create relation
      await createRelation(
        sourceDbId,
        targetDbId,
        sourcePropertyName,
        targetPropertyName,
        notionClient
      );
      
      console.log(`[${i + 1}/${newRelations.length}] ${sourceDbName} → ${targetDbName} ✅`);
      successCount++;
      
      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`[${i + 1}/${newRelations.length}] ${sourceDbName} → ${targetDbName} ❌ Error: ${error.message}`);
      errorCount++;
      // Continue with next relation
    }
  }
  
  if (successCount > 0 || skipCount > 0 || errorCount > 0) {
    console.log(`\n✅ Schema gaps fixed: ${successCount} created, ${skipCount} skipped, ${errorCount} errors`);
  }
}

/**
 * Update month titles with emojis and new format
 * @param {Object} databaseMap - Map of database names to IDs
 * @param {string} year - Year string
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<void>}
 */
async function updateMonthTitles(databaseMap, year, notionClient) {
  const monthsDbName = `${year} Months`;
  const monthsDbId = databaseMap[monthsDbName];
  
  if (!monthsDbId) {
    throw new Error(`Months database "${monthsDbName}" not found`);
  }
  
  const monthConfig = [
    { month: 1, icon: "⛄", title: "01. Jan", oldTitle: "January" },
    { month: 2, icon: "❤️", title: "02. Feb", oldTitle: "February" },
    { month: 3, icon: "☘️", title: "03. Mar", oldTitle: "March" },
    { month: 4, icon: "☂️", title: "04. Apr", oldTitle: "April" },
    { month: 5, icon: "💐", title: "05. May", oldTitle: "May" },
    { month: 6, icon: "☀️", title: "06. Jun", oldTitle: "June" },
    { month: 7, icon: "🍦", title: "07. Jul", oldTitle: "July" },
    { month: 8, icon: "✏️", title: "08. Aug", oldTitle: "August" },
    { month: 9, icon: "🍎", title: "09. Sep", oldTitle: "September" },
    { month: 10, icon: "🎃", title: "10. Oct", oldTitle: "October" },
    { month: 11, icon: "🍁", title: "11. Nov", oldTitle: "November" },
    { month: 12, icon: "❄️", title: "12. Dec", oldTitle: "December" }
  ];
  
  // Query all month pages
  const response = await notionClient.databases.query({
    database_id: monthsDbId
  });
  
  // Build map from old title to page
  const monthPageMap = {};
  for (const page of response.results) {
    const titleProp = page.properties["Month"];
    const monthName = titleProp?.title?.[0]?.plain_text || "";
    if (monthName) {
      monthPageMap[monthName] = page;
    }
  }
  
  // Second pass: map pages with new format titles to old title keys
  // This makes the function idempotent - works whether pages have old or new format
  for (const config of monthConfig) {
    // If page not already mapped under oldTitle, check if it exists under new title
    if (!monthPageMap[config.oldTitle]) {
      const pageWithNewTitle = monthPageMap[config.title];
      if (pageWithNewTitle) {
        // Map the new title format back to old title for lookup
        monthPageMap[config.oldTitle] = pageWithNewTitle;
      }
    }
  }
  
  console.log("\n📝 Phase 6b: Updating month titles...");
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < monthConfig.length; i++) {
    const config = monthConfig[i];
    const page = monthPageMap[config.oldTitle];
    
    if (!page) {
      console.error(`[${i + 1}/12] ${config.oldTitle} ❌ Page not found`);
      errorCount++;
      continue;
    }
    
    try {
      // Check if title already matches new format (idempotency)
      const currentTitle = page.properties["Month"]?.title?.[0]?.plain_text || "";
      if (currentTitle === config.title) {
        console.log(`[${i + 1}/12] ${config.oldTitle} → ${config.title} ⏭️  (already updated)`);
        skipCount++;
        continue;
      }
      
      // Update page with icon and title
      await notionClient.pages.update({
        page_id: page.id,
        icon: { type: "emoji", emoji: config.icon },
        properties: {
          "Month": {
            title: [{ text: { content: config.title } }]
          }
        }
      });
      
      console.log(`[${i + 1}/12] ${config.oldTitle} → ${config.title} ✅`);
      successCount++;
      
      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`[${i + 1}/12] ${config.oldTitle} ❌ Error: ${error.message}`);
      errorCount++;
      // Continue with next month
    }
  }
  
  console.log(`\n✅ Month titles updated: ${successCount} updated, ${skipCount} skipped, ${errorCount} errors`);
}

/**
 * Create weekly database records
 * @param {Object} databaseMap - Map of database names to IDs
 * @param {string} year - Year string
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<void>}
 */
async function createWeeklyRecords(databaseMap, year, notionClient) {
  const weeksDbName = `${year} Weeks`;
  const weeksDbId = databaseMap[weeksDbName];
  
  if (!weeksDbId) {
    throw new Error(`Weeks database "${weeksDbName}" not found`);
  }
  
  // Get date property name for Weeks (reuse Phase 4/5 logic)
  const { DATABASE_CONFIG } = require("./generate-year-config");
  const weeksConfig = DATABASE_CONFIG.find(config => config.name === "{year} Weeks");
  const sourceWeeksDbId = weeksConfig?.sourceId;
  const datePropertyName = sourceWeeksDbId 
    ? await getWeeksDatePropertyName(sourceWeeksDbId, notionClient)
    : "Date Range (SET)";
  
  // Fetch all week pages
  const weekRows = await getWeekRows(weeksDbId, datePropertyName, notionClient);
  
  // Build map from week title to page ID
  const weekMap = {};
  for (const week of weekRows) {
    weekMap[week.title] = week.pageId;
  }
  
  const weeklyConfigs = [
    {
      dbName: "{year} Personal Summaries Weeks",
      titleProperty: "Week Summary",
      titleFormat: (weekNum) => `Week ${String(weekNum).padStart(2, "0")} Personal Summary`,
      relationProperty: "⏰ {year} Weeks"
    },
    {
      dbName: "{year} Work Summaries Weeks",
      titleProperty: "Week Summary",
      titleFormat: (weekNum) => `Week ${String(weekNum).padStart(2, "0")} Work Summary`,
      relationProperty: "⏰ {year} Weeks"
    },
    {
      dbName: "{year} Personal Retro Weeks",
      titleProperty: "Personal Retro",
      titleFormat: (weekNum) => `Week ${String(weekNum).padStart(2, "0")} Personal Retro`,
      relationProperty: "⏰ {year} Weeks"
    },
    {
      dbName: "{year} Work Retro Weeks",
      titleProperty: "Work Retro",
      titleFormat: (weekNum) => `Week ${String(weekNum).padStart(2, "0")} Work Retro`,
      relationProperty: "⏰ {year} Weeks"
    }
  ];
  
  console.log("\n📅 Phase 6c: Creating weekly records...");
  let totalSuccessCount = 0;
  let totalSkipCount = 0;
  let totalErrorCount = 0;
  
  for (let dbIdx = 0; dbIdx < weeklyConfigs.length; dbIdx++) {
    const config = weeklyConfigs[dbIdx];
    const dbName = config.dbName.replace("{year}", year);
    const dbId = databaseMap[dbName];
    
    if (!dbId) {
      console.error(`\n${dbName} ❌ Database not found`);
      totalErrorCount += weekRows.length;
      continue;
    }
    
    const relationPropertyName = config.relationProperty.replace("{year}", year);
    
    console.log(`\n${dbName}:`);
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < weekRows.length; i++) {
      const week = weekRows[i];
      const weekNum = parseInt(week.title.match(/\d+/)?.[0] || "0", 10);
      const title = config.titleFormat(weekNum);
      const weekPageId = weekMap[week.title];
      
      try {
        // Check if record already exists
        const existing = await findExistingRow(dbId, config.titleProperty, title, notionClient);
        if (existing) {
          skipCount++;
          continue;
        }
        
        // Create page
        await notionClient.pages.create({
          parent: { database_id: dbId },
          properties: {
            [config.titleProperty]: {
              title: [{ text: { content: title } }]
            },
            [relationPropertyName]: {
              relation: [{ id: weekPageId }]
            }
          }
        });
        
        console.log(`[${i + 1}/${weekRows.length}] ${title} ✅`);
        successCount++;
        
        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[${i + 1}/${weekRows.length}] ${title} ❌ Error: ${error.message}`);
        errorCount++;
        // Continue with next week
      }
    }
    
    totalSuccessCount += successCount;
    totalSkipCount += skipCount;
    totalErrorCount += errorCount;
  }
  
  console.log(`\n✅ Weekly records created: ${totalSuccessCount} created, ${totalSkipCount} skipped, ${totalErrorCount} errors`);
}

/**
 * Create monthly database records
 * @param {Object} databaseMap - Map of database names to IDs
 * @param {string} year - Year string
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<void>}
 */
async function createMonthlyRecords(databaseMap, year, notionClient) {
  const monthsDbName = `${year} Months`;
  const monthsDbId = databaseMap[monthsDbName];
  
  if (!monthsDbId) {
    throw new Error(`Months database "${monthsDbName}" not found`);
  }
  
  // Query all month pages (using new title format)
  const response = await notionClient.databases.query({
    database_id: monthsDbId
  });
  
  // Build map from month title to page ID
  const monthMap = {};
  for (const page of response.results) {
    const titleProp = page.properties["Month"];
    const monthTitle = titleProp?.title?.[0]?.plain_text || "";
    if (monthTitle) {
      monthMap[monthTitle] = page.id;
    }
  }
  
  const monthlyConfigs = [
    {
      dbName: "{year} Personal Recaps - Month",
      titleProperty: "Month Recap",
      relationProperty: "🗓️ {year} Months"
    },
    {
      dbName: "{year} Work Recaps - Month",
      titleProperty: "Month Recap",
      relationProperty: "🗓️ {year} Months"
    }
  ];
  
  // Month titles in new format (from 6b)
  const monthTitles = [
    "01. Jan", "02. Feb", "03. Mar", "04. Apr", "05. May", "06. Jun",
    "07. Jul", "08. Aug", "09. Sep", "10. Oct", "11. Nov", "12. Dec"
  ];
  
  console.log("\n📊 Phase 6d: Creating monthly records...");
  let totalSuccessCount = 0;
  let totalSkipCount = 0;
  let totalErrorCount = 0;
  
  for (let dbIdx = 0; dbIdx < monthlyConfigs.length; dbIdx++) {
    const config = monthlyConfigs[dbIdx];
    const dbName = config.dbName.replace("{year}", year);
    const dbId = databaseMap[dbName];
    
    if (!dbId) {
      console.error(`\n${dbName} ❌ Database not found`);
      totalErrorCount += monthTitles.length;
      continue;
    }
    
    const relationPropertyName = config.relationProperty.replace("{year}", year);
    
    console.log(`\n${dbName}:`);
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < monthTitles.length; i++) {
      const monthTitle = monthTitles[i];
      const title = `${monthTitle} Recap`;
      const monthPageId = monthMap[monthTitle];
      
      if (!monthPageId) {
        console.error(`[${i + 1}/12] ${title} ❌ Month "${monthTitle}" not found`);
        errorCount++;
        continue;
      }
      
      try {
        // Check if record already exists
        const existing = await findExistingRow(dbId, config.titleProperty, title, notionClient);
        if (existing) {
          console.log(`[${i + 1}/12] ${title} ⏭️  (already exists)`);
          skipCount++;
          continue;
        }
        
        // Create page
        await notionClient.pages.create({
          parent: { database_id: dbId },
          properties: {
            [config.titleProperty]: {
              title: [{ text: { content: title } }]
            },
            [relationPropertyName]: {
              relation: [{ id: monthPageId }]
            }
          }
        });
        
        console.log(`[${i + 1}/12] ${title} ✅`);
        successCount++;
        
        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[${i + 1}/12] ${title} ❌ Error: ${error.message}`);
        errorCount++;
        // Continue with next month
      }
    }
    
    totalSuccessCount += successCount;
    totalSkipCount += skipCount;
    totalErrorCount += errorCount;
  }
  
  console.log(`\n✅ Monthly records created: ${totalSuccessCount} created, ${totalSkipCount} skipped, ${totalErrorCount} errors`);
}

/**
 * Create Year record
 * @param {Object} databaseMap - Map of database names to IDs
 * @param {string} year - Year string
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<void>}
 */
async function createYearRecord(databaseMap, year, notionClient) {
  const yearDbName = `${year} Year`;
  const monthsDbName = `${year} Months`;
  const yearDbId = databaseMap[yearDbName];
  const monthsDbId = databaseMap[monthsDbName];
  
  if (!yearDbId) {
    throw new Error(`Year database "${yearDbName}" not found`);
  }
  
  if (!monthsDbId) {
    throw new Error(`Months database "${monthsDbName}" not found`);
  }
  
  // Get relation property name from RELATION_CONFIG
  const { RELATION_CONFIG } = require("./generate-year-config");
  const yearToMonthsRelation = RELATION_CONFIG.find(
    config => config.sourceDb === "{year} Year" && config.targetDb === "{year} Months"
  );
  
  if (!yearToMonthsRelation) {
    throw new Error("Year to Months relation config not found");
  }
  
  const relationPropertyName = yearToMonthsRelation.sourcePropertyName.replace("{year}", year);
  
  // Query all month pages
  const response = await notionClient.databases.query({
    database_id: monthsDbId
  });
  
  const allMonthPageIds = response.results.map(page => page.id);
  
  console.log("\n📆 Phase 6e: Creating year record...");
  
  try {
    // Check if Year record already exists
    const existing = await findExistingRow(yearDbId, "Year", year, notionClient);
    if (existing) {
      console.log(`${year} ⏭️  (already exists)`);
      return;
    }
    
    // Create year page
    await notionClient.pages.create({
      parent: { database_id: yearDbId },
      properties: {
        "Year": {
          title: [{ text: { content: year } }]
        },
        [relationPropertyName]: {
          relation: allMonthPageIds.map(id => ({ id }))
        }
      }
    });
    
    console.log(`${year} ✅`);
  } catch (error) {
    console.error(`${year} ❌ Error: ${error.message}`);
    throw error;
  }
}

/**
 * Main Phase 6 orchestration function
 * @param {string} pageId - Year page ID
 * @param {string} databasesPageId - Databases subpage ID
 * @param {string} year - Year string
 * @param {Object} notionClient - Notion client instance
 * @returns {Promise<void>}
 */
async function runPhase6(pageId, databasesPageId, year, notionClient) {
  // Scan for databases
  console.log("🔍 Scanning for database IDs...");
  const databaseMap = await scanForDatabases(pageId, databasesPageId, notionClient);
  console.log(`Found ${Object.keys(databaseMap).length} databases`);
  
  // 6a: Fix schema gaps
  await fixSchemaGaps(databaseMap, year, notionClient);
  
  // 6b: Update month titles
  await updateMonthTitles(databaseMap, year, notionClient);
  
  // 6c: Create weekly records
  await createWeeklyRecords(databaseMap, year, notionClient);
  
  // 6d: Create monthly records
  await createMonthlyRecords(databaseMap, year, notionClient);
  
  // 6e: Create year record
  await createYearRecord(databaseMap, year, notionClient);
  
  // Output results
  console.log("\n════════════════════════════════════════════════════════════");
  console.log("✅ Phase 6 Complete: All remaining records populated and schema gaps fixed");
  console.log("════════════════════════════════════════════════════════════");
}

/**
 * Print .env IDs only - scans existing databases and outputs their IDs
 * @param {string} pageId - Year page ID
 * @param {string} year - Year string
 * @param {Object} notionClient - Notion client instance
 */
async function printEnvIdsOnly(pageId, year, notionClient) {
  // Import config
  const { DATABASE_CONFIG } = require("./generate-year-config");

  // Find existing databases subpage
  const existingSubpageId = await findDatabasesSubpage(pageId, year, notionClient);
  if (!existingSubpageId) {
    console.error("\n❌ No databases found. Run full script first to create them.");
    process.exit(1);
  }

  // Scan for databases
  console.log("🔍 Scanning for database IDs...");
  const databaseMap = await scanForDatabases(pageId, existingSubpageId, notionClient);
  
  if (Object.keys(databaseMap).length === 0) {
    console.error("\n❌ No databases found. Run full script first to create them.");
    process.exit(1);
  }

  // Map database names to env vars
  const databases = [];
  for (const config of DATABASE_CONFIG) {
    const dbName = config.name.replace("{year}", year);
    const dbId = databaseMap[dbName];
    
    if (dbId) {
      databases.push({
        envVar: config.envVar,
        id: dbId
      });
    }
  }

  // Sort by envVar name for consistent output
  databases.sort((a, b) => a.envVar.localeCompare(b.envVar));

  // Print output
  outputEnvVars(databases, year);
  
  process.exit(0);
}

/**
 * Main CLI function
 */
async function main() {
  let spinner;
  try {
    output.header("Generate Year Structure");
    console.log(
      "Populates an existing Notion page with year databases and structure.\n"
    );
    console.log(
      'First, create an empty page in Notion (e.g., "2026"), then paste the URL below.\n'
    );

    // Initialize Notion client
    const db = new NotionDatabase();
    const notionClient = db.client;

    // Prompt for page URL
    const urlInput = await promptForPageUrl();

    // Extract page ID from URL
    let pageId;
    try {
      pageId = extractPageId(urlInput);
    } catch (error) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }

    // Fetch the page
    spinner = createSpinner("Fetching page...");
    spinner.start();
    let page;
    try {
      page = await fetchPage(pageId, notionClient);
      spinner.stop();
    } catch (error) {
      if (spinner) spinner.stop();
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }

    // Extract page title
    const pageTitle = getPageTitle(page);

    // Success output
    console.log(`\n✅ Found page: "${pageTitle}"`);
    console.log(`Page URL: ${page.url}`);

    // Extract year from page title
    const year = extractYearFromTitle(pageTitle);

    // Menu prompt: choose action
    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: ["Run full script", "Print .env IDs only"]
      }
    ]);

    // If "Print .env IDs only" selected, execute and exit
    if (action === "Print .env IDs only") {
      await printEnvIdsOnly(pageId, year, notionClient);
      return; // Exit early (printEnvIdsOnly already calls process.exit(0))
    }

    // Otherwise, continue with full script

    // Find or create "{year} Databases" subpage (needed for both Phase 1 and Phase 2)
    let databasesPageId;
    const existingSubpageId = await findDatabasesSubpage(pageId, year, notionClient);
    if (existingSubpageId) {
      databasesPageId = existingSubpageId;
      console.log(`\n📁 Found "${year} Databases" subpage`);
    } else {
      console.log(`\n📁 Creating "${year} Databases" subpage...`);
      try {
        databasesPageId = await createSubpage(
          pageId,
          `${year} Databases`,
          "ℹ️",
          notionClient
        );
        console.log("✅ Created subpage");
      } catch (error) {
        console.error(`❌ Failed to create subpage: ${error.message}`);
        process.exit(1);
      }
    }

    // Phase 1: Database creation

    // Import database config
    const { DATABASE_CONFIG } = require("./generate-year-config");

    // Create databases
    console.log("\n📊 Creating databases (Phase 1: Basic properties only)...");
    const createdDatabases = [];
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < DATABASE_CONFIG.length; i++) {
      const config = DATABASE_CONFIG[i];
      const dbName = config.name.replace("{year}", year);
      const parentId = config.parent === "year" ? pageId : databasesPageId;

      try {
        // Check if database already exists
        const exists = await checkDatabaseExists(
          parentId,
          dbName,
          notionClient
        );
        if (exists) {
          console.log(`[${i + 1}/23] ${dbName} ⏭️  (already exists)`);
          skipCount++;
          continue;
        }

        // Fetch source schema
        const sourceProperties = await fetchDatabaseSchema(
          config.sourceId,
          notionClient
        );

        // Filter to Phase 1 properties
        const filteredProperties = filterPhase1Properties(
          sourceProperties,
          config.omitProperties || []
        );

        // Transform properties for creation (rename and format)
        const transformedProperties = {};
        for (const [name, prop] of Object.entries(filteredProperties)) {
          const newName = transformPropertyName(name, year);
          transformedProperties[newName] = transformPropertyForCreation(
            prop,
            year
          );
        }

        // Create database
        const newDbId = await createDatabase(
          parentId,
          dbName,
          config.icon,
          transformedProperties,
          notionClient
        );

        createdDatabases.push({
          envVar: config.envVar,
          id: newDbId,
        });

        console.log(`[${i + 1}/23] ${dbName} ✅`);
        successCount++;

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[${i + 1}/23] ${dbName} ❌ Error: ${error.message}`);
        errorCount++;
        // Continue with next database
      }
    }

    // Output results
    console.log(
      "\n════════════════════════════════════════════════════════════"
    );
    console.log(
      `✅ Phase 1 Complete: ${successCount} created, ${skipCount} skipped, ${errorCount} errors`
    );
    console.log("════════════════════════════════════════════════════════════");

    if (createdDatabases.length > 0) {
      outputEnvVars(createdDatabases, year);
    }

    // Phase 2: Add relations
    console.log("\n🔗 Phase 2: Adding relations...");
    try {
      await runPhase2(pageId, databasesPageId, year, notionClient);
    } catch (error) {
      console.error(`\n❌ Phase 2 Error: ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      // Don't exit - allow user to see what was completed
    }

    // Phase 3: Add formulas and rollups
    console.log("\n🧮 Phase 3: Adding formulas and rollups...");
    try {
      await runPhase3(pageId, databasesPageId, year, notionClient);
    } catch (error) {
      console.error(`\n❌ Phase 3 Error: ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      // Don't exit - allow user to see what was completed
    }

    // Phase 4: Populate Weeks and Months
    try {
      await runPhase4(pageId, databasesPageId, year, notionClient);
    } catch (error) {
      console.error(`\n❌ Phase 4 Error: ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      // Don't exit - allow user to see what was completed
    }

    // Phase 5: Wire Weeks to Months
    try {
      await runPhase5(pageId, databasesPageId, year, notionClient);
    } catch (error) {
      console.error(`\n❌ Phase 5 Error: ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      // Don't exit - allow user to see what was completed
    }

    // Phase 6: Populate Remaining Records and Fix Schema
    try {
      await runPhase6(pageId, databasesPageId, year, notionClient);
      console.log("\n✅ All phases complete!");
      console.log("\n════════════════════════════════════════════════════════════");
      console.log("📋 MANUAL STEPS REQUIRED");
      console.log("════════════════════════════════════════════════════════════");
      console.log("The Notion API cannot create Status properties. Add these manually:\n");
      console.log(`  • ${year} Trips: Status`);
      console.log(`  • ${year} Events: Status`);
      console.log(`  • ${year} Tasks: Status`);
      console.log(`  • ${year} Goals: Status`);
      console.log(`  • ${year} Rocks: Status, Retro`);
      console.log(`  • ${year} Personal Retro Weeks: Status`);
      console.log(`  • ${year} Work Retro Weeks: Status`);
      console.log(`  • ${year} Personal Recaps - Month: Personal Recap Status`);
      console.log(`  • ${year} Work Recaps - Month: Work Recap Status`);
      console.log("\nIn Notion: Open each database → + New Property → Status");
      console.log("════════════════════════════════════════════════════════════");
    } catch (error) {
      console.error(`\n❌ Phase 6 Error: ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      // Don't exit - allow user to see what was completed
    }
  } catch (error) {
    if (spinner) spinner.stop();
    console.error(`\n❌ Error: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
