// ==UserScript==
// @name         Copy Quickly
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  快速复制粘贴工具：点击按钮粘贴剪贴板内容，或复制选中文本 - 优化Android版本
// @author       yuyuchen2
// @match        *://*/*
// @grant        GM_setClipboard
// @grant        GM_getClipboard
// @grant        unsafeWindow
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACw=
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 用于全局跟踪脚本状态
    if (window.copyQuicklyLoaded) {
        console.log('Copy Quickly 已加载，跳过重复加载');
        return;
    }
    window.copyQuicklyLoaded = true;

    console.log('✅ Copy Quickly v1.2 脚本开始加载');

    // 样式配置 - 针对移动设备优化
    const BUTTON_STYLES = {
        paste: {
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '8px 14px',
            fontSize: '14px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: '999999',
            position: 'fixed',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            fontFamily: 'Arial, sans-serif'
        },
        copy: {
            backgroundColor: '#2196F3',
            color: 'white',
            padding: '8px 14px',
            fontSize: '14px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: '999999',
            position: 'fixed',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            fontFamily: 'Arial, sans-serif'
        }
    };

    // 应用样式到元素
    function applyStyles(element, styles) {
        try {
            Object.keys(styles).forEach(key => {
                element.style[key] = styles[key];
            });
        } catch (e) {
            console.error('应用样式失败:', e);
        }
    }

    // 从剪贴板读取 - 针对暴力猴优化
    function getClipboardText() {
        return new Promise((resolve, reject) => {
            try {
                // 暴力猴/油猴的标准方法
                if (typeof GM_getClipboard !== 'undefined') {
                    try {
                        const text = GM_getClipboard('text');
                        if (text) {
                            console.log('✓ GM_getClipboard 成功获取');
                            resolve(text);
                            return;
                        }
                    } catch (e) {
                        console.warn('GM_getClipboard 错误:', e.message);
                    }
                }

                // 备选方案: 原生 Clipboard API
                if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
                    navigator.clipboard.readText().then(text => {
                        console.log('✓ Clipboard API 成功获取');
                        resolve(text);
                    }).catch(e => {
                        console.warn('Clipboard API 失败:', e.message);
                        reject(new Error('剪贴板读取失败'));
                    });
                    return;
                }

                reject(new Error('暴力猴无剪贴板权限'));
            } catch (e) {
                console.error('获取剪贴板异常:', e);
                reject(e);
            }
        });
    }

    // 写入剪贴板 - 针对暴力猴优化
    function copyToClipboard(text) {
        return new Promise((resolve, reject) => {
            try {
                // 暴力猴/油猴的标准方法
                if (typeof GM_setClipboard !== 'undefined') {
                    try {
                        GM_setClipboard(text, 'text');
                        console.log('✓ GM_setClipboard 成功复制');
                        resolve(true);
                        return;
                    } catch (e) {
                        console.warn('GM_setClipboard 错误:', e.message);
                    }
                }

                // 备选方案: 原生 Clipboard API
                if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                    navigator.clipboard.writeText(text).then(() => {
                        console.log('✓ Clipboard API 成功复制');
                        resolve(true);
                    }).catch(e => {
                        console.warn('Clipboard API 失败:', e.message);
                        reject(new Error('复制失败'));
                    });
                    return;
                }

                reject(new Error('暴力猴无剪贴板权限'));
            } catch (e) {
                console.error('复制异常:', e);
                reject(e);
            }
        });
    }

    // 创建粘贴按钮
    function createPasteButton(element) {
        const button = document.createElement('button');
        button.textContent = '📋 粘贴';
        button.className = 'copy-quickly-paste-btn';
        button.type = 'button';
        applyStyles(button, BUTTON_STYLES.paste);

        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // 禁用按钮，显示加载状态
            button.disabled = true;
            button.textContent = '加载中...';

            getClipboardText().then(clipboardText => {
                if (!clipboardText || clipboardText.trim() === '') {
                    showFeedback(button, '✗ 剪贴板为空', '📋 粘贴');
                    return;
                }
                
                // 填充输入框
                element.value = clipboardText;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.focus();
                
                showFeedback(button, '✓ 粘贴成功', '📋 粘贴');
                console.log('✓ 粘贴完成');
            }).catch(err => {
                console.error('粘贴错误:', err);
                showFeedback(button, '✗ 粘贴失败', '📋 粘贴');
            });
        });

        return button;
    }

    // 创建复制按钮
    function createCopyButton() {
        const button = document.createElement('button');
        button.textContent = '📄 复制';
        button.className = 'copy-quickly-copy-btn';
        button.type = 'button';
        applyStyles(button, BUTTON_STYLES.copy);

        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            button.disabled = true;
            button.textContent = '复制中...';

            const selectedText = window.getSelection().toString();
            
            if (!selectedText || selectedText.trim() === '') {
                showFeedback(button, '✗ 未选中', '📄 复制');
                return;
            }

            copyToClipboard(selectedText).then(() => {
                showFeedback(button, '✓ 已复制', '📄 复制');
                console.log('✓ 复制完成');
            }).catch(err => {
                console.error('复制错误:', err);
                showFeedback(button, '✗ 复制失败', '📄 复制');
            });
        });

        return button;
    }

    // 显示操作反馈
    function showFeedback(button, message, originalText) {
        button.textContent = message;
        button.disabled = true;

        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, 2000);
    }

    // 处理输入框/文本框
    function handleInputFocus(e) {
        const element = e.target;
        
        // 检查是否是有效的输入元素
        if (element.tagName !== 'INPUT' && element.tagName !== 'TEXTAREA') {
            return;
        }

        // 防止重复监听
        if (element.classList.contains('copy-quickly-monitored')) {
            return;
        }

        element.classList.add('copy-quickly-monitored');

        let pasteButton = null;

        // 当用户开始输入时显示粘贴按钮
        const inputHandler = function() {
            if (!pasteButton || !document.body.contains(pasteButton)) {
                pasteButton = createPasteButton(element);
                document.body.appendChild(pasteButton);
            }

            // 定位按钮到输入框下方
            const rect = element.getBoundingClientRect();
            pasteButton.style.left = Math.max(10, rect.left) + 'px';
            pasteButton.style.top = (rect.bottom + 10) + 'px';
        };

        // 失焦时隐藏按钮
        const blurHandler = function() {
            if (pasteButton && document.body.contains(pasteButton)) {
                pasteButton.remove();
                pasteButton = null;
            }
        };

        element.addEventListener('input', inputHandler);
        element.addEventListener('blur', blurHandler);
    }

    // 处理文本选择
    function handleTextSelection() {
        const selectedText = window.getSelection().toString();
        
        // 移除旧的复制按钮
        const oldButtons = document.querySelectorAll('.copy-quickly-copy-btn');
        oldButtons.forEach(btn => {
            if (document.body.contains(btn)) {
                btn.remove();
            }
        });

        if (selectedText.length > 0) {
            const copyButton = createCopyButton();
            document.body.appendChild(copyButton);

            // 定位到屏幕中心
            copyButton.style.left = (window.innerWidth / 2 - 40) + 'px';
            copyButton.style.top = '50px';

            // 点击其他地方时移除按钮
            const removeHandler = function(e) {
                if (!e.target.classList.contains('copy-quickly-copy-btn') && 
                    document.body.contains(copyButton)) {
                    copyButton.remove();
                    document.removeEventListener('click', removeHandler);
                }
            };

            setTimeout(() => {
                document.addEventListener('click', removeHandler);
            }, 100);
        }
    }

    // 主初始化函数
    function init() {
        console.log('Copy Quickly 初始化中...');

        try {
            // 监听焦点事件以处理输入框
            document.addEventListener('focusin', handleInputFocus, true);
            console.log('✓ 已监听输入框焦点事件');

            // 监听文本选择
            document.addEventListener('mouseup', handleTextSelection);
            document.addEventListener('touchend', handleTextSelection);
            console.log('✓ 已监听文本选择事件');

            // 处理动态加载的内容
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
                                if (!node.classList.contains('copy-quickly-monitored')) {
                                    const event = new Event('focusin', { bubbles: true });
                                    node.dispatchEvent(event);
                                }
                            } else if (node.querySelectorAll) {
                                const inputs = node.querySelectorAll('input, textarea');
                                inputs.forEach(input => {
                                    if (!input.classList.contains('copy-quickly-monitored')) {
                                        const event = new Event('focusin', { bubbles: true });
                                        input.dispatchEvent(event);
                                    }
                                });
                            }
                        }
                    });
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            console.log('✓ 已监听动态内容');

            // 初始化已有的输入框
            setTimeout(() => {
                document.querySelectorAll('input, textarea').forEach(element => {
                    if (!element.classList.contains('copy-quickly-monitored')) {
                        const event = new Event('focusin', { bubbles: true });
                        element.dispatchEvent(event);
                    }
                });
                console.log('✓ 已初始化现有输入框');
            }, 500);

            console.log('✅ Copy Quickly v1.2 加载成功！');
        } catch (e) {
            console.error('Copy Quickly 初始化失败:', e);
        }
    }

    // 等待DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();