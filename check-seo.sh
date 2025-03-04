#!/bin/bash

echo "=== Kontrola SEO prvků pro Infinityloop - Cosmic Collector ==="
echo ""

# Kontrola souboru robots.txt
if [ -f "robots.txt" ]; then
    echo "✅ robots.txt nalezen"
else
    echo "❌ robots.txt nenalezen"
fi

# Kontrola souboru sitemap.xml
if [ -f "sitemap.xml" ]; then
    echo "✅ sitemap.xml nalezen"
else
    echo "❌ sitemap.xml nenalezen"
fi

# Kontrola favicon
if [ -f "favicon.png" ]; then
    echo "✅ favicon.png nalezen"
else
    echo "❌ favicon.png nenalezen"
fi

# Kontrola obrázku pro sociální sítě
if [ -f "og-image.png" ]; then
    echo "✅ og-image.png nalezen"
else
    echo "❌ og-image.png nenalezen"
fi

# Kontrola SEO meta tagů v index.html
if [ -f "index.html" ]; then
    echo -n "Kontrola meta tagů v index.html: "
    META_COUNT=$(grep -c "<meta name=\"description\"" index.html)
    
    if [ $META_COUNT -gt 0 ]; then
        echo "✅ Meta description nalezen"
    else
        echo "❌ Meta description nenalezen"
    fi
    
    echo -n "Kontrola Open Graph tagů: "
    OG_COUNT=$(grep -c "og:title" index.html)
    
    if [ $OG_COUNT -gt 0 ]; then
        echo "✅ Open Graph tagy nalezeny"
    else
        echo "❌ Open Graph tagy nenalezeny"
    fi
    
    echo -n "Kontrola strukturovaných dat Schema.org: "
    SCHEMA_COUNT=$(grep -c "application/ld+json" index.html)
    
    if [ $SCHEMA_COUNT -gt 0 ]; then
        echo "✅ Strukturovaná data nalezena"
    else
        echo "❌ Strukturovaná data nenalezena"
    fi
else
    echo "❌ index.html nenalezen"
fi

echo ""
echo "=== SEO kontrola dokončena ==="
