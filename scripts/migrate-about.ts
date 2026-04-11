const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting About Page content migration...");

  // Check if we already have AboutSections
  const existingSections = await prisma.aboutSection.count();
  if (existingSections > 0) {
    console.log("AboutSection table already has data. Aborting migration to prevent duplication.");
    return;
  }

  // Find the old system setting
  const setting = await prisma.systemSetting.findUnique({
    where: { setting_key: "about_page_content" }
  });

  if (!setting || !setting.setting_value) {
    console.log("No existing 'about_page_content' found in SystemSettings. Migration complete.");
    return;
  }

  const data = setting.setting_value;
  
  // Create HERO
  if (data.heroTitle || data.heroSubtitle) {
    await prisma.aboutSection.create({
      data: {
        block_type: "HERO",
        title: data.heroTitle || "",
        subtitle: data.heroSubtitle || "",
        display_order: 0,
        is_active: true,
      }
    });
    console.log("Created HERO section");
  }

  // Create CARDS (Mission/Vision)
  if (data.missionText || data.visionText) {
    await prisma.aboutSection.create({
      data: {
        block_type: "CARDS",
        title: "Our Mission & Vision",
        display_order: 1,
        is_active: true,
        items: {
          create: [
            {
              title: "Our Mission",
              description: data.missionText || "",
              icon: "Target",
              color_theme: "primary",
              display_order: 0,
            },
            {
              title: "Our Vision",
              description: data.visionText || "",
              icon: "Eye",
              color_theme: "secondary",
              display_order: 1,
            }
          ]
        }
      }
    });
    console.log("Created CARDS section (Mission & Vision)");
  }

  // Create TEXT (Who We Are)
  if (data.whoWeAreText) {
    await prisma.aboutSection.create({
      data: {
        block_type: "TEXT",
        title: "Who We Are",
        content: data.whoWeAreText || "",
        display_order: 2,
        is_active: true,
      }
    });
    console.log("Created TEXT section (Who We Are)");
  }

  // Create GRID (Core Values)
  if (data.coreValues && Array.isArray(data.coreValues) && data.coreValues.length > 0) {
    await prisma.aboutSection.create({
      data: {
        block_type: "GRID",
        title: "Our Core Values",
        subtitle: "Guided by principles that ensure the highest standards in scholarly publishing",
        display_order: 3,
        is_active: true,
        items: {
          create: data.coreValues.map((v, i) => ({
            title: v.title || "",
            description: v.desc || "",
            icon: v.icon || "Globe",
            color_theme: v.color || "primary",
            display_order: i,
          }))
        }
      }
    });
    console.log("Created GRID section (Core Values)");
  }

  // Create STATS (Platform Analytics)
  await prisma.aboutSection.create({
    data: {
      block_type: "STATS",
      title: "Impact & Growth",
      subtitle: "Measurable outcomes reflecting our commitment to advancing scholarly communication worldwide",
      display_order: 4,
      is_active: true,
    }
  });
  console.log("Created STATS section");

  // Create TEXT (Brand Philosophy)
  if (data.brandPhilosophyText) {
    await prisma.aboutSection.create({
      data: {
        block_type: "TEXT",
        title: "Our Brand Philosophy",
        content: data.brandPhilosophyText || "",
        display_order: 5,
        is_active: true,
      }
    });
    console.log("Created TEXT section (Brand Philosophy)");
  }

  console.log("Migration completed successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
