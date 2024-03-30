async function getHtml() {
    // 克隆整个 HTML 树
    const target = document.querySelector('html').cloneNode(true);
    // 创建一个 style 元素用于存储过滤后的 CSS 规则
    const style = document.createElement('style');

    // 判断选择器是否匹配元素，包括带有 Shadow DOM 的元素
    function hasElement(selector, el) {
        return el.querySelector(selector) !== null || [...el.querySelectorAll(selector)].some(el => el.shadowRoot);
    }

    // 过滤 CSS 规则
    function filterCssRules(cssRules, target) {
        let filteredCss = '';
        for (const rule of cssRules) {
            if (rule.type === 1) { // CSSRule.STYLE_RULE
                // 判断当前规则的选择器是否匹配元素或者是否包含伪类，是则添加到 filteredCss 中
                if (hasElement(rule.selectorText, target) || rule.selectorText === ':root' || rule.selectorText.includes(':')) {
                    filteredCss += `${rule.cssText}\n`;
                }
            } else if (rule.type === 4) { // CSSRule.MEDIA_RULE
                // 如果是媒体查询规则，则根据条件匹配进行进一步过滤
                const mediaQuery = window.matchMedia(rule.conditionText);
                if (mediaQuery.matches) {
                    filteredCss += filterCssRules(rule.cssRules, target);
                }
            }
        }
        return filteredCss;
    }

    // 异步获取外部样式表并过滤其中的规则
    async function fetchAndFilterExternalStyleSheet(href, target) {
        const response = await fetch(href);
        if (!response.ok) return '';
        const text = await response.text();
        const styleSheet = new CSSStyleSheet();
        styleSheet.replaceSync(text);
        return filterCssRules(styleSheet.cssRules, target);
    }

    // 获取并过滤所有样式表
    async function getStyleSheet() {
        let filteredCss = '';
        for (const styleSheet of document.styleSheets) {
            if (styleSheet.href && !styleSheet.href.includes(window.location.origin)) {
                // 如果是外部样式表，则异步获取并过滤
                const filtered = await fetchAndFilterExternalStyleSheet(styleSheet.href, target);
                if (filtered) {
                    filteredCss += filtered;
                }
            } else {
                // 否则直接过滤内联样式表
                filteredCss += filterCssRules(styleSheet.cssRules, target);
            }
        }
        return filteredCss;
    }

    // 将过滤后的样式表添加到 style 元素中
    style.innerHTML = await getStyleSheet();

    // 移除 HTML 中的 script 和 link 元素
    target.querySelectorAll('script').forEach(script => script.remove());
    target.querySelectorAll('link').forEach(link => link.remove());

    // 克隆目标 HTML 树并添加过滤后的样式表
    const htmlRender = target.cloneNode(true);
    htmlRender.appendChild(style);

    // 压缩 HTML 并输出
    const compressedHtml = htmlRender.outerHTML.replace(/(\n|\t)*/g, '');
    console.log(compressedHtml);
}

// 调用函数开始处理
getHtml();
