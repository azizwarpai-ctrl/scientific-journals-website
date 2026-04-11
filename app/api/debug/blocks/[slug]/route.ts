import { NextResponse } from "next/server";
import { resolveJournalOjsId } from "@/src/features/journals/server/resolve-journal";

// Ensure this route never caches so you get a fresh database query every time you visit
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // 1. Resolve Journal ID
    const resolved = await resolveJournalOjsId(slug);
    if (!resolved.found || !resolved.ojsId) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Could not resolve journal ID locally or from OJS database.", 
          requestedSlug: slug 
        },
        { status: 404 }
      );
    }

    const jId = resolved.ojsId;

    const { isOjsConfigured, ojsQuery } = await import("@/src/features/ojs/server/ojs-client");
    
    if (!isOjsConfigured()) {
      return NextResponse.json({ success: false, error: "OJS Database connection is not configured." }, { status: 500 });
    }

    // 2. Query block manager config
    const blockManagerRaw = await ojsQuery<any>(
      `SELECT setting_name, setting_value 
       FROM plugin_settings 
       WHERE plugin_name = 'customblockmanagerplugin' 
       AND context_id = ?`,
      [jId]
    );

    let activeBlocksParsed: any = null;
    let blockManagerError = null;

    if (blockManagerRaw.length > 0) {
      const rawVal = blockManagerRaw[0].setting_value;
      try {
        activeBlocksParsed = JSON.parse(rawVal);
      } catch (e: any) {
        blockManagerError = "Failed to parse JSON. Assuming standard PHP serialized string or raw text.";
        activeBlocksParsed = rawVal;
      }
    }

    // 3. Query all individual blocks registered to the journal
    const blocksContentMap = await ojsQuery<any>(
      `SELECT setting_name, setting_value
       FROM plugin_settings
       WHERE plugin_name = 'customblockplugin'
       AND setting_name LIKE 'blockContent-%'
       AND context_id = ?`,
      [jId]
    );

    const detailedBlocks = blocksContentMap.map((row) => {
      const val = typeof row.setting_value === "string" ? row.setting_value.trim() : String(row.setting_value);
      let parsed = null;
      let isJson = false;
      let localeKeys = [];

      if (val.startsWith("{") || val.startsWith("[")) {
        try {
          parsed = JSON.parse(val);
          isJson = true;
          if (parsed && typeof parsed === "object") {
             localeKeys = Object.keys(parsed);
          }
        } catch (e) {
          parsed = "Parse Error! Value looked like JSON but failed.";
        }
      }

      return {
        settingName: row.setting_name,
        isJson,
        localeKeysFound: localeKeys,
        parsedData: parsed,
        rawLength: val.length,
        rawExcerpt: val.substring(0, 500)
      };
    });

    // Return pure JSON payload for browser inspection
    return NextResponse.json({
      success: true,
      journalSlug: slug,
      resolvedOjsId: jId,
      managerSettings: {
        rawRowsDetected: blockManagerRaw.length,
        parsingError: blockManagerError,
        data: activeBlocksParsed,
      },
      blockContents: {
        totalRows: blocksContentMap.length,
        details: detailedBlocks
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || "Unknown internal server error", 
        stack: error?.stack 
      }, 
      { status: 500 }
    );
  }
}
