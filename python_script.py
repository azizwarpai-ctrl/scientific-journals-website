import sys

with open('app/about/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip().startswith('const renderText = '):
        break
    new_lines.append(line)

replacement = """  const renderText = (section: AboutSection, index: number) => (
    <GSAPWrapper key={section.id?.toString() || index} animation="slideUp">
      <Card className="h-full flex flex-col hover:shadow-xl transition-all duration-300 border-border/40 overflow-hidden bg-background rounded-2xl">
        <CardContent className="p-8 md:p-10 flex-1 flex flex-col">
          {section.title && (
            <h2 className="mb-6 text-2xl md:text-3xl font-bold tracking-tight border-b border-border/50 pb-4">
              {section.title}
            </h2>
          )}
          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap flex-1">
            {section.content}
          </div>
        </CardContent>
      </Card>
    </GSAPWrapper>
  )

  const renderCards = (section: AboutSection, index: number) => {
    return (
      <GSAPWrapper key={section.id?.toString() || index} animation="slideUp">
        <Card className="h-full flex flex-col hover:shadow-xl transition-all duration-300 border-border/40 overflow-hidden bg-background rounded-2xl">
          <CardContent className="p-8 md:p-10 flex-1 flex flex-col">
            {section.title && (
              <div className="mb-8">
                <h2 className="mb-2 text-2xl md:text-3xl font-bold tracking-tight">{section.title}</h2>
                {section.subtitle && (
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {section.subtitle}
                  </p>
                )}
                <div className="mt-4 border-b border-border/50" />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 flex-1">
              {section.items?.map((item, i) => (
                <div key={item.id?.toString() || i} className="group hover:bg-muted/30 rounded-xl p-4 transition-all duration-300 border border-border/40 bg-muted/10">
                  <div className={cn(
                    "mb-4 flex h-12 w-12 items-center justify-center rounded-lg transition-colors duration-300",
                    item.color_theme === 'secondary' ? 'bg-secondary/10 group-hover:bg-secondary/20' : 'bg-primary/10 group-hover:bg-primary/20'
                  )}>
                    <DynamicIcon name={item.icon} className={cn("h-6 w-6", item.color_theme === 'secondary' ? 'text-secondary' : 'text-primary')} />
                  </div>
                  {item.title && <h3 className="mb-2 text-lg font-bold tracking-tight">{item.title}</h3>}
                  {item.description && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.description}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </GSAPWrapper>
    )
  }

  const renderGrid = (section: AboutSection, index: number) => (
    <GSAPWrapper key={section.id?.toString() || index} animation="slideUp">
      <Card className="h-full flex flex-col hover:shadow-xl transition-all duration-300 border-border/40 overflow-hidden bg-background rounded-2xl">
        <CardContent className="p-8 md:p-10 flex-1 flex flex-col">
          {(section.title || section.subtitle) && (
            <div className="mb-8 text-center">
              {section.title && <h2 className="mb-2 text-2xl md:text-3xl font-bold tracking-tight">{section.title}</h2>}
              {section.subtitle && (
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {section.subtitle}
                </p>
              )}
              <div className="mt-4 border-b border-border/50" />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 flex-1">
            {section.items?.map((item, i) => (
              <div key={item.id?.toString() || i} className="text-center p-4">
                <div className="mb-4 flex justify-center">
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full",
                    item.color_theme === "secondary" ? "bg-secondary/10" : "bg-primary/10"
                  )}>
                    <DynamicIcon name={item.icon} className={cn(
                      "h-6 w-6",
                      item.color_theme === "secondary" ? "text-secondary" : "text-primary"
                    )} />
                  </div>
                </div>
                {item.title && <h3 className="mb-2 font-bold text-base tracking-tight">{item.title}</h3>}
                {item.description && <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </GSAPWrapper>
  )

  const renderStatsSection = () => (
    <GSAPWrapper key="ojs-statistics" animation="fadeIn">
      <section className="py-24 bg-muted/30 border-t border-border/40">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 uppercase tracking-wider">
              <BarChart3 className="h-4 w-4" />
              Platform Analytics
            </div>
            <h2 className="mb-4 text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground text-balance">
              {adminStatsBlock?.title || "Our Global Impact"}
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed text-balance">
              {adminStatsBlock?.subtitle || "Driving open-access discovery and collaboration across the scientific community."}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            <StatCard icon={BookOpen} value={stats.totalJournals || 0} label="Active Journals" />
            <StatCard icon={FileText} value={stats.totalArticles || 0} label="Published Articles" />
            <StatCard icon={Users} value={stats.totalUsers || 0} label="Researchers" />
            <StatCard icon={Globe} value={stats.countriesCount || 0} label="Countries Reached" />
          </div>
        </div>
      </section>
    </GSAPWrapper>
  )

  const renderPlaceholder = (title: string, index: number, keyStr: string) => {
    // Map icons based on section
    const PlaceholderIcon = keyStr === "who_we_are" ? Building2 : keyStr === "vision" ? Eye : Target;

    return (
      <GSAPWrapper key={placeholder--} animation="slideUp">
        <Card className="h-full flex flex-col hover:shadow-xl transition-all duration-300 border-border/40 overflow-hidden bg-background rounded-2xl">
          <CardContent className="p-8 flex flex-col items-center justify-center flex-1 text-center min-h-[300px]">
            <div className="h-16 w-16 mb-6 rounded-full bg-muted/50 border border-border shadow-sm flex items-center justify-center">
              <PlaceholderIcon className="h-8 w-8 text-muted-foreground opacity-60" />
            </div>
            <h3 className="mb-2 text-2xl font-bold tracking-tight">{title}</h3>
            <p className="text-muted-foreground bg-muted/30 px-4 py-2 rounded-lg border border-dashed border-border/50">
              No content available yet
            </p>
          </CardContent>
        </Card>
      </GSAPWrapper>
    )
  }

  // Structuring logic
  const activeSections = sections || []
  const whoWeAre = activeSections.find(s => s.section_key === "who_we_are")
  const vision = activeSections.find(s => s.section_key === "vision")
  const goals = activeSections.find(s => s.section_key === "goals")
  
  const customHero = activeSections.filter(s => s.block_type === "HERO" && !s.section_key)
  const customOthers = activeSections.filter(s => s.block_type !== "HERO" && s.block_type !== "STATS" && !s.section_key)

  // Default fallback hero if admin hasn't created one
  const heroBlocks = customHero.length > 0 ? customHero : [{
    block_type: "HERO",
    title: "About DigitalPub",
    subtitle: "Empowering the scientific community through open, transparent, and high-impact publishing.",
    isFallback: true
  }]

  const contentToGrid = [
    whoWeAre || { placeholder: true, title: "Who We Are", key: "who_we_are" },
    vision || { placeholder: true, title: "Our Vision", key: "vision" },
    goals || { placeholder: true, title: "Our Mission", key: "goals" },
    ...customOthers
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/20">
      <Navbar />
      <main className="flex-1">
        {heroBlocks.map((section: any, index: number) => renderHero(section, index))}

        <section className="py-20 bg-muted/10">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 auto-rows-fr">
              {contentToGrid.map((section: any, index: number) => {
                if (section.placeholder) {
                  return renderPlaceholder(section.title, index, section.key)
                }
                switch (section.block_type) {
                  case "TEXT": return renderText(section, index)
                  case "CARDS": return renderCards(section, index)
                  case "GRID": return renderGrid(section, index)
                  default: return null
                }
              })}
            </div>
          </div>
        </section>

        {/* OJS Statistics — always rendered at the bottom when data is available */}
        {hasStats && renderStatsSection()}
      </main>
      <Footer />
    </div>
  )
}
"""

with open('app/about/page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
    f.write(replacement)
