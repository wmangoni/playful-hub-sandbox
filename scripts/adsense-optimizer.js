const fs = require('fs');
const path = require('path');

// Configurações otimizadas para Google AdSense
const adsenseConfig = {
    // Slots de anúncios otimizados para diferentes posições
    adSlots: {
        // Banner superior (header)
        header: {
            slot: '1892478235',
            format: 'auto',
            responsive: true,
            position: 'header'
        },
        // Sidebar principal
        sidebar1: {
            slot: '1892478236',
            format: 'auto',
            responsive: true,
            position: 'sidebar-top'
        },
        // Sidebar inferior
        sidebar2: {
            slot: '1892478237',
            format: 'auto',
            responsive: true,
            position: 'sidebar-bottom'
        },
        // Entre conteúdo
        inContent: {
            slot: '1892478238',
            format: 'auto',
            responsive: true,
            position: 'in-content'
        },
        // Banner inferior
        footer: {
            slot: '1892478239',
            format: 'auto',
            responsive: true,
            position: 'footer'
        },
        // Mobile específico
        mobile: {
            slot: '1892478240',
            format: 'auto',
            responsive: true,
            position: 'mobile-optimized'
        }
    },
    
    // Configurações de otimização
    optimization: {
        // Lazy loading para anúncios
        lazyLoading: true,
        // Intersection Observer para carregamento otimizado
        intersectionObserver: true,
        // Ad refresh (recarregamento de anúncios)
        adRefresh: {
            enabled: true,
            interval: 30000, // 30 segundos
            maxRefreshes: 3
        },
        // Viewability tracking
        viewabilityTracking: true,
        // Mobile-first approach
        mobileFirst: true
    }
};

// Função para gerar HTML otimizado de anúncios
function generateOptimizedAdHTML(adConfig, customClass = '') {
    const { slot, format, responsive, position } = adConfig;
    
    return `
        <div class="ad-container ${position} ${customClass}" data-ad-slot="${slot}">
            <ins class="adsbygoogle"
                 style="display:block"
                 data-ad-client="ca-pub-6741914590073026"
                 data-ad-slot="${slot}"
                 data-ad-format="${format}"
                 data-full-width-responsive="${responsive}"
                 data-lazy-loading="true"></ins>
            <div class="ad-loading" style="display: none;">
                <div class="loading-spinner"></div>
                <span>Carregando anúncio...</span>
            </div>
        </div>
    `;
}

// Função para gerar CSS otimizado para anúncios
function generateAdOptimizedCSS() {
    return `
        /* AdSense Optimization Styles */
        .ad-container {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            padding: 1rem;
            text-align: center;
            min-height: 250px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--border-color);
            margin: 1rem 0;
            position: relative;
            overflow: hidden;
        }
        
        .ad-container.header {
            min-height: 90px;
            margin: 0.5rem 0;
        }
        
        .ad-container.footer {
            min-height: 90px;
            margin: 2rem 0 0 0;
        }
        
        .ad-container.in-content {
            min-height: 280px;
            margin: 2rem 0;
            background: rgba(255, 255, 255, 0.03);
        }
        
        .ad-container.mobile-optimized {
            min-height: 200px;
            margin: 1rem 0;
        }
        
        .ad-container ins {
            width: 100%;
            height: 100%;
            min-height: inherit;
        }
        
        /* Loading states */
        .ad-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--text-muted);
            font-size: 0.9rem;
        }
        
        .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: var(--highlight-color);
            animation: spin 1s ease-in-out infinite;
            margin-bottom: 0.5rem;
        }
        
        /* Ad visibility optimization */
        .ad-container[data-ad-loaded="false"] {
            opacity: 0.7;
        }
        
        .ad-container[data-ad-loaded="true"] {
            opacity: 1;
            transition: opacity 0.3s ease;
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
            .ad-container {
                min-height: 200px;
                padding: 0.5rem;
            }
            
            .ad-container.header,
            .ad-container.footer {
                min-height: 50px;
            }
            
            .ad-container.in-content {
                min-height: 250px;
            }
        }
        
        /* Tablet optimizations */
        @media (min-width: 769px) and (max-width: 1024px) {
            .ad-container {
                min-height: 220px;
            }
        }
        
        /* Desktop optimizations */
        @media (min-width: 1025px) {
            .ad-container.sidebar-top,
            .ad-container.sidebar-bottom {
                min-height: 300px;
            }
        }
        
        /* Ad refresh indicator */
        .ad-refresh-indicator {
            position: absolute;
            top: 5px;
            right: 5px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.7rem;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .ad-container:hover .ad-refresh-indicator {
            opacity: 1;
        }
        
        /* Performance optimizations */
        .ad-container.lazy {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.5s ease, transform 0.5s ease;
        }
        
        .ad-container.lazy.loaded {
            opacity: 1;
            transform: translateY(0);
        }
        
        /* AdSense policy compliance */
        .ad-label {
            font-size: 0.7rem;
            color: var(--text-muted);
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* Error states */
        .ad-container.error {
            background: rgba(244, 67, 54, 0.1);
            border-color: rgba(244, 67, 54, 0.3);
        }
        
        .ad-container.error::after {
            content: "Anúncio indisponível";
            color: var(--text-muted);
            font-size: 0.8rem;
        }
    `;
}

// Função para gerar JavaScript otimizado para AdSense
function generateAdOptimizedJS() {
    return `
        // AdSense Optimization Script
        (function() {
            'use strict';
            
            // Configuration
            const config = {
                lazyLoading: true,
                intersectionObserver: true,
                adRefresh: {
                    enabled: true,
                    interval: 30000,
                    maxRefreshes: 3
                },
                viewabilityTracking: true
            };
            
            // Ad refresh tracking
            const adRefreshCount = new Map();
            
            // Initialize AdSense
            function initializeAdSense() {
                if (typeof adsbygoogle !== 'undefined') {
                    // Push all ads
                    (adsbygoogle = window.adsbygoogle || []).push({});
                    
                    // Track ad loading
                    trackAdLoading();
                } else {
                    // Retry if AdSense not loaded
                    setTimeout(initializeAdSense, 1000);
                }
            }
            
            // Track ad loading and viewability
            function trackAdLoading() {
                const adContainers = document.querySelectorAll('.ad-container');
                
                adContainers.forEach(container => {
                    const adSlot = container.dataset.adSlot;
                    
                    // Set initial state
                    container.setAttribute('data-ad-loaded', 'false');
                    
                    // Create intersection observer for viewability
                    if (config.intersectionObserver && 'IntersectionObserver' in window) {
                        const observer = new IntersectionObserver((entries) => {
                            entries.forEach(entry => {
                                if (entry.isIntersecting) {
                                    // Ad is visible
                                    trackAdView(adSlot);
                                    
                                    // Start refresh timer if enabled
                                    if (config.adRefresh.enabled) {
                                        startAdRefresh(container, adSlot);
                                    }
                                }
                            });
                        }, {
                            threshold: 0.5 // 50% visible
                        });
                        
                        observer.observe(container);
                    }
                    
                    // Track ad load success/failure
                    const adElement = container.querySelector('ins.adsbygoogle');
                    if (adElement) {
                        // Listen for ad load events
                        adElement.addEventListener('load', () => {
                            container.setAttribute('data-ad-loaded', 'true');
                            hideLoadingIndicator(container);
                        });
                        
                        // Handle ad load errors
                        adElement.addEventListener('error', () => {
                            container.classList.add('error');
                            hideLoadingIndicator(container);
                        });
                    }
                });
            }
            
            // Track ad views for analytics
            function trackAdView(adSlot) {
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'ad_view', {
                        'ad_slot': adSlot,
                        'event_category': 'AdSense',
                        'event_label': 'Ad View'
                    });
                }
            }
            
            // Start ad refresh timer
            function startAdRefresh(container, adSlot) {
                const currentCount = adRefreshCount.get(adSlot) || 0;
                
                if (currentCount < config.adRefresh.maxRefreshes) {
                    setTimeout(() => {
                        refreshAd(container, adSlot);
                    }, config.adRefresh.interval);
                }
            }
            
            // Refresh individual ad
            function refreshAd(container, adSlot) {
                const currentCount = adRefreshCount.get(adSlot) || 0;
                
                if (currentCount < config.adRefresh.maxRefreshes) {
                    // Show refresh indicator
                    showRefreshIndicator(container);
                    
                    // Clear current ad
                    const adElement = container.querySelector('ins.adsbygoogle');
                    if (adElement) {
                        adElement.innerHTML = '';
                    }
                    
                    // Reload ad
                    if (typeof adsbygoogle !== 'undefined') {
                        (adsbygoogle = window.adsbygoogle || []).push({});
                    }
                    
                    // Update count
                    adRefreshCount.set(adSlot, currentCount + 1);
                    
                    // Track refresh
                    if (typeof gtag !== 'undefined') {
                        gtag('event', 'ad_refresh', {
                            'ad_slot': adSlot,
                            'refresh_count': currentCount + 1,
                            'event_category': 'AdSense',
                            'event_label': 'Ad Refresh'
                        });
                    }
                }
            }
            
            // Show loading indicator
            function showLoadingIndicator(container) {
                const loading = container.querySelector('.ad-loading');
                if (loading) {
                    loading.style.display = 'flex';
                }
            }
            
            // Hide loading indicator
            function hideLoadingIndicator(container) {
                const loading = container.querySelector('.ad-loading');
                if (loading) {
                    loading.style.display = 'none';
                }
            }
            
            // Show refresh indicator
            function showRefreshIndicator(container) {
                let indicator = container.querySelector('.ad-refresh-indicator');
                if (!indicator) {
                    indicator = document.createElement('div');
                    indicator.className = 'ad-refresh-indicator';
                    indicator.textContent = 'Atualizando...';
                    container.appendChild(indicator);
                }
                indicator.style.opacity = '1';
                
                setTimeout(() => {
                    indicator.style.opacity = '0';
                }, 2000);
            }
            
            // Lazy loading for ads
            function initializeLazyLoading() {
                if (config.lazyLoading && 'IntersectionObserver' in window) {
                    const lazyAds = document.querySelectorAll('.ad-container.lazy');
                    
                    const lazyObserver = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                const container = entry.target;
                                container.classList.add('loaded');
                                
                                // Load the ad
                                const adElement = container.querySelector('ins.adsbygoogle');
                                if (adElement && typeof adsbygoogle !== 'undefined') {
                                    (adsbygoogle = window.adsbygoogle || []).push({});
                                }
                                
                                lazyObserver.unobserve(container);
                            }
                        });
                    });
                    
                    lazyAds.forEach(ad => {
                        lazyObserver.observe(ad);
                    });
                }
            }
            
            // Initialize everything when DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    initializeAdSense();
                    initializeLazyLoading();
                });
            } else {
                initializeAdSense();
                initializeLazyLoading();
            }
            
            // Performance monitoring
            if ('performance' in window) {
                window.addEventListener('load', () => {
                    setTimeout(() => {
                        const adContainers = document.querySelectorAll('.ad-container');
                        const loadedAds = document.querySelectorAll('.ad-container[data-ad-loaded="true"]');
                        
                        const loadRate = (loadedAds.length / adContainers.length) * 100;
                        
                        if (typeof gtag !== 'undefined') {
                            gtag('event', 'ad_performance', {
                                'total_ads': adContainers.length,
                                'loaded_ads': loadedAds.length,
                                'load_rate': Math.round(loadRate),
                                'event_category': 'AdSense',
                                'event_label': 'Performance'
                            });
                        }
                    }, 5000); // Wait 5 seconds after page load
                });
            }
        })();
    `;
}

// Função para otimizar uma página existente
function optimizePageForAdSense(pagePath) {
    try {
        let html = fs.readFileSync(pagePath, 'utf8');
        
        // Adicionar CSS otimizado
        const optimizedCSS = generateAdOptimizedCSS();
        html = html.replace('</style>', `\n        ${optimizedCSS}\n    </style>`);
        
        // Adicionar JavaScript otimizado
        const optimizedJS = generateAdOptimizedJS();
        html = html.replace('</script>', `\n        ${optimizedJS}\n    </script>`);
        
        // Otimizar anúncios existentes
        html = html.replace(
            /<ins class="adsbygoogle"[^>]*><\/ins>/g,
            (match) => {
                // Adicionar lazy loading se não estiver presente
                if (!match.includes('data-lazy-loading')) {
                    return match.replace('>', ' data-lazy-loading="true">');
                }
                return match;
            }
        );
        
        // Adicionar indicadores de carregamento
        html = html.replace(
            /<div class="ad-container[^"]*"[^>]*>([\\s\\S]*?)<ins class="adsbygoogle"[^>]*><\/ins>([\\s\\S]*?)<\/div>/g,
            (match, before, after) => {
                const loadingHTML = `
                    <div class="ad-loading">
                        <div class="loading-spinner"></div>
                        <span>Carregando anúncio...</span>
                    </div>
                `;
                return match.replace('</ins>', `</ins>${loadingHTML}`);
            }
        );
        
        // Salvar página otimizada
        fs.writeFileSync(pagePath, html, 'utf8');
        return true;
    } catch (error) {
        console.error(`Erro ao otimizar página ${pagePath}:`, error.message);
        return false;
    }
}

// Função para otimizar todas as páginas
function optimizeAllPagesForAdSense() {
    const jogosDir = path.join(__dirname, '../jogos');
    const files = fs.readdirSync(jogosDir);
    
    let optimizedCount = 0;
    
    files.forEach(file => {
        if (file.endsWith('.html')) {
            const filePath = path.join(jogosDir, file);
            if (optimizePageForAdSense(filePath)) {
                optimizedCount++;
                console.log(`✅ Página otimizada: ${file}`);
            }
        }
    });
    
    // Otimizar página principal também
    const mainPagePath = path.join(__dirname, '../index.html');
    if (fs.existsSync(mainPagePath)) {
        if (optimizePageForAdSense(mainPagePath)) {
            optimizedCount++;
            console.log(`✅ Página principal otimizada: index.html`);
        }
    }
    
    console.log(`\\n🎉 ${optimizedCount} páginas foram otimizadas para Google AdSense!`);
    console.log(`📊 Otimizações aplicadas:`);
    console.log(`   • Lazy loading de anúncios`);
    console.log(`   • Intersection Observer para viewability`);
    console.log(`   • Ad refresh automático`);
    console.log(`   • Tracking de performance`);
    console.log(`   • Mobile-first optimization`);
    console.log(`   • Error handling`);
}

// Executar se chamado diretamente
if (require.main === module) {
    optimizeAllPagesForAdSense();
}

module.exports = {
    adsenseConfig,
    generateOptimizedAdHTML,
    generateAdOptimizedCSS,
    generateAdOptimizedJS,
    optimizePageForAdSense,
    optimizeAllPagesForAdSense
};
