// ==UserScript==
// @name         Copy Quickly
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  快速复制粘贴工具：点击按钮粘贴剪贴板内容，或复制选中文本
// @author       yuyuchen2
// @match        *://*/*
// @grant        GM_setClipboard
// @grant        GM_getClipboard
// @grant        GM.xmlHttpRequest
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACw=
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 样式配置
    const BUTTON_STYLES = {
        paste: {
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '6px 12px',
            fontSize: '12px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: '10000',
            position: 'absolute',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            fontWeight: 'bold',
            transition: 'all 0.2s ease'
        },
        copy: {
            backgroundColor: '#2196F3',
            color: 'white',
            padding: '8px 16px',
            fontSize: '13px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: '10001',
            position: 'fixed',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            fontWeight: 'bold',
            transition: 'all 0.2s ease'
        }
    };

    // 应用样式到元素
    function applyStyles(element, styles) {
        Object.assign(element.style, styles);
        // 添加悬停效果
        element.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        });
        element.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        });
    }

    // 创建粘贴按钮
    function createPasteButton(element) {
        const button = document.createElement('button');
        button.textContent = '📋 粘贴';
        button.className = 'copy-quickly-paste-btn';
        applyStyles(button, BUTTON_STYLES.paste);

        button.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            try {
                const clipboardText = await navigator.clipboard.readText();
                element.value = clipboardText;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                showFeedback(button, '✓ 粘贴成功');
            } catch (err) {
                console.error('粘贴失败:', err);
                showFeedback(button, '✗ 粘贴失败');
            }
        });

        return button;
    }

    // 创建复制按钮
    function createCopyButton() {
        const button = document.createElement('button');
        button.textContent = '📄 复制';
        button.className = 'copy-quickly-copy-btn';
        applyStyles(button, BUTTON_STYLES.copy);

        button.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            try {
                const selectedText = window.getSelection().toString();
                if (selectedText) {
                    await navigator.clipboard.writeText(selectedText);
                    showFeedback(button, '✓ 已复制');
                }
            } catch (err) {
                console.error('复制失败:', err);
                showFeedback(button, '✗ 复制失败');
            }
        });

        return button;
    }

    // 显示操作反馈
    function showFeedback(button, message) {
        const originalText = button.textContent;
        button.textContent = message;
        button.disabled = true;

        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, 2000);
    }

    // 定位按钮到输入框/文本框旁边
    function positionPasteButton(button, element) {
        const rect = element.getBoundingClientRect();
        button.style.left = (rect.right + 8) + 'px';
        button.style.top = (rect.top + rect.height / 2 - 15) + 'px';

        // 确保按钮不超出视图
        setTimeout(() => {
            const buttonRect = button.getBoundingClientRect();
            if (buttonRect.right > window.innerWidth) {
                button.style.left = (rect.left - button.offsetWidth - 8) + 'px';
            }
            if (buttonRect.bottom > window.innerHeight) {
                button.style.top = (rect.top - button.offsetHeight - 8) + 'px';
            }
        }, 0);
    }

    // 定位复制按钮到鼠标位置附近
    function positionCopyButton(button, x, y) {
        button.style.left = (x + 10) + 'px';
        button.style.top = (y + 10) + 'px';

        setTimeout(() => {
            const rect = button.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                button.style.left = (x - button.offsetWidth - 10) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                button.style.top = (y - button.offsetHeight - 10) + 'px';
            }
        }, 0);
    }

    // 处理输入框/文本框的聚焦
    function handleInputFocus(e) {
        const element = e.target;
        if (!element.classList.contains('copy-quickly-monitored')) {
            element.classList.add('copy-quickly-monitored');

            let pasteButton = null;

            // 输入时显示粘贴按钮
            element.addEventListener('input', function() {
                if (!pasteButton || !pasteButton.parentNode) {
                    pasteButton = createPasteButton(element);
                    document.body.appendChild(pasteButton);
                }
                positionPasteButton(pasteButton, element);
            });

            // 失焦时隐藏粘贴按钮
            element.addEventListener('blur', function() {
                if (pasteButton && pasteButton.parentNode) {
                    pasteButton.remove();
                    pasteButton = null;
                }
            });

            // 窗口滚动时更新按钮位置
            window.addEventListener('scroll', function() {
                if (pasteButton && pasteButton.parentNode) {
                    positionPasteButton(pasteButton, element);
                }
            });
        }
    }

    // 处理文本选择
    document.addEventListener('mouseup', function() {
        const selectedText = window.getSelection().toString();
        
        // 移除旧的复制按钮
        const oldButton = document.querySelector('.copy-quickly-copy-btn');
        if (oldButton) {
            oldButton.remove();
        }

        if (selectedText.length > 0) {
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            const copyButton = createCopyButton();
            document.body.appendChild(copyButton);
            positionCopyButton(copyButton, rect.right, rect.top);

            // 点击其他地方时移除按钮
            document.addEventListener('mousedown', function removeButton(e) {
                if (!e.target.classList.contains('copy-quickly-copy-btn')) {
                    copyButton.remove();
                    document.removeEventListener('mousedown', removeButton);
                }
            });
        }
    });

    // 监听输入框和文本框
    document.addEventListener('focusin', handleInputFocus, true);

    // 处理动态加载的内容
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // Element node
                    if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
                        node.addEventListener('focus', handleInputFocus);
                    } else {
                        const inputs = node.querySelectorAll('input, textarea');
                        inputs.forEach(input => input.addEventListener('focus', handleInputFocus));
                    }
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 初始化已存在的输入框
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('input, textarea').forEach(element => {
            element.addEventListener('focus', handleInputFocus);
        });
    });

    console.log('✅ Copy Quickly 脚本已加载');
})();