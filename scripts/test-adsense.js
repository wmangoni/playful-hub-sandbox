const fs = require('fs');
const path = require('path');

// Função para testar se as páginas foram otimizadas corretamente
function testAdSenseOptimization() {
    console.log('🧪 Testando otimizações do Google AdSense...\n');
    
    const jogosDir = path.join(__dirname, '../jogos');
    const files = fs.readdirSync(jogosDir);
    
    let totalTests = 0;
    let passedTests = 0;
    const results = [];
    
    files.forEach(file => {
        if (file.endsWith('.html')) {
            const filePath = path.join(jogosDir, file);
            const html = fs.readFileSync(filePath, 'utf8');
            
            const tests = [
                {
                    name: 'Google AdSense Script',
                    test: () => html.includes('pagead2.googlesyndication.com'),
                    required: true
                },
                {
                    name: 'Google Analytics',
                    test: () => html.includes('gtag/js') && html.includes('G-J0T2LXD7XH'),
                    required: true
                },
                {
                    name: 'Google Tag Manager',
                    test: () => html.includes('GTM-KM6SHZXP'),
                    required: true
                },
                {
                    name: 'Meta Description',
                    test: () => html.includes('<meta name="description"'),
                    required: true
                },
                {
                    name: 'Meta Keywords',
                    test: () => html.includes('<meta name="keywords"'),
                    required: true
                },
                {
                    name: 'Open Graph Tags',
                    test: () => html.includes('og:title') && html.includes('og:description'),
                    required: true
                },
                {
                    name: 'AdSense Ad Containers',
                    test: () => html.includes('adsbygoogle') && html.includes('data-ad-client'),
                    required: true
                },
                {
                    name: 'Lazy Loading',
                    test: () => html.includes('data-lazy-loading="true"'),
                    required: true
                },
                {
                    name: 'Loading Indicators',
                    test: () => html.includes('ad-loading') && html.includes('loading-spinner'),
                    required: true
                },
                {
                    name: 'Intersection Observer',
                    test: () => html.includes('IntersectionObserver'),
                    required: true
                },
                {
                    name: 'Ad Refresh Logic',
                    test: () => html.includes('ad_refresh') && html.includes('refreshAd'),
                    required: true
                },
                {
                    name: 'Performance Monitoring',
                    test: () => html.includes('ad_performance') && html.includes('load_rate'),
                    required: true
                },
                {
                    name: 'Mobile Optimization',
                    test: () => html.includes('@media (max-width: 768px)'),
                    required: true
                },
                {
                    name: 'Breadcrumb Navigation',
                    test: () => html.includes('breadcrumb') && html.includes('PlayfulHub'),
                    required: true
                },
                {
                    name: 'Game Instructions',
                    test: () => html.includes('Como Jogar') && html.includes('controls-grid'),
                    required: true
                },
                {
                    name: 'Tips Section',
                    test: () => html.includes('Dicas e Estratégias') && html.includes('tip-item'),
                    required: true
                },
                {
                    name: 'Related Games',
                    test: () => html.includes('Jogos Relacionados') && html.includes('related-game'),
                    required: true
                },
                {
                    name: 'Game Information',
                    test: () => html.includes('Sobre o Jogo') && html.includes('info-grid'),
                    required: true
                }
            ];
            
            const fileResults = {
                file: file,
                tests: [],
                passed: 0,
                total: tests.length
            };
            
            tests.forEach(test => {
                totalTests++;
                const passed = test.test();
                if (passed) {
                    passedTests++;
                    fileResults.passed++;
                }
                
                fileResults.tests.push({
                    name: test.name,
                    passed: passed,
                    required: test.required
                });
            });
            
            results.push(fileResults);
        }
    });
    
    // Exibir resultados
    console.log('📊 RESULTADOS DOS TESTES:\n');
    
    results.forEach(result => {
        const status = result.passed === result.total ? '✅' : '⚠️';
        const percentage = Math.round((result.passed / result.total) * 100);
        
        console.log(`${status} ${result.file}`);
        console.log(`   ${result.passed}/${result.total} testes passaram (${percentage}%)`);
        
        // Mostrar testes que falharam
        const failedTests = result.tests.filter(test => !test.passed);
        if (failedTests.length > 0) {
            console.log('   ❌ Testes que falharam:');
            failedTests.forEach(test => {
                console.log(`      • ${test.name}`);
            });
        }
        console.log('');
    });
    
    // Resumo geral
    const overallPercentage = Math.round((passedTests / totalTests) * 100);
    console.log('🎯 RESUMO GERAL:');
    console.log(`   Total de testes: ${totalTests}`);
    console.log(`   Testes passaram: ${passedTests}`);
    console.log(`   Taxa de sucesso: ${overallPercentage}%`);
    
    if (overallPercentage >= 90) {
        console.log('🎉 Excelente! As otimizações estão funcionando perfeitamente.');
    } else if (overallPercentage >= 75) {
        console.log('👍 Bom! A maioria das otimizações está funcionando.');
    } else {
        console.log('⚠️ Atenção! Algumas otimizações precisam ser revisadas.');
    }
    
    // Verificar configurações específicas do AdSense
    console.log('\n🔍 VERIFICAÇÃO ESPECÍFICA DO ADSENSE:');
    
    const configPath = path.join(__dirname, '../config/adsense-config.json');
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log('✅ Arquivo de configuração encontrado');
        console.log(`   Publisher ID: ${config.publisherId}`);
        console.log(`   Analytics ID: ${config.analyticsId}`);
        console.log(`   GTM ID: ${config.gtmId}`);
        console.log(`   Slots configurados: ${Object.keys(config.adSlots).length}`);
        console.log(`   Lazy Loading: ${config.optimization.lazyLoading ? 'Ativado' : 'Desativado'}`);
        console.log(`   Ad Refresh: ${config.optimization.adRefresh.enabled ? 'Ativado' : 'Desativado'}`);
    } else {
        console.log('❌ Arquivo de configuração não encontrado');
    }
    
    // Verificar estrutura de URLs
    console.log('\n🌐 VERIFICAÇÃO DE URLS:');
    const serverPath = path.join(__dirname, '../server.js');
    if (fs.existsSync(serverPath)) {
        const serverContent = fs.readFileSync(serverPath, 'utf8');
        const seoRoutes = (serverContent.match(/\/jogos\//g) || []).length;
        console.log(`✅ ${seoRoutes} rotas SEO-friendly configuradas (/jogos/)`);
    }
    
    return {
        totalTests,
        passedTests,
        percentage: overallPercentage,
        results
    };
}

// Função para gerar relatório de otimização
function generateOptimizationReport() {
    const testResults = testAdSenseOptimization();
    
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalTests: testResults.totalTests,
            passedTests: testResults.passedTests,
            successRate: testResults.percentage
        },
        optimizations: {
            adsense: {
                lazyLoading: true,
                intersectionObserver: true,
                adRefresh: true,
                viewabilityTracking: true,
                mobileOptimization: true
            },
            seo: {
                metaTags: true,
                openGraph: true,
                breadcrumbs: true,
                structuredData: false // Pode ser implementado futuramente
            },
            content: {
                gameInstructions: true,
                tipsAndStrategies: true,
                relatedGames: true,
                gameInformation: true
            },
            performance: {
                mobileFirst: true,
                responsiveDesign: true,
                loadingOptimization: true
            }
        },
        recommendations: []
    };
    
    // Adicionar recomendações baseadas nos resultados
    if (testResults.percentage < 100) {
        report.recommendations.push('Revisar testes que falharam e corrigir problemas identificados');
    }
    
    if (testResults.percentage >= 90) {
        report.recommendations.push('Considerar implementar Schema.org markup para melhor SEO');
        report.recommendations.push('Adicionar mais slots de anúncios em posições estratégicas');
        report.recommendations.push('Implementar A/B testing para otimizar conversões');
    }
    
    // Salvar relatório
    const reportPath = path.join(__dirname, '../reports/optimization-report.json');
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n📄 Relatório salvo em: ${reportPath}`);
    
    return report;
}

// Executar se chamado diretamente
if (require.main === module) {
    generateOptimizationReport();
}

module.exports = {
    testAdSenseOptimization,
    generateOptimizationReport
};
