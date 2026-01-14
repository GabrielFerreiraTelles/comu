// Utilitário para processar markdown básico em mensagens

export const parseMarkdown = (text: string): string => {
  let html = text;

  // Escapar HTML existente
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Negrito: **texto** ou __texto__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Itálico: *texto* ou _texto_
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Código inline: `código`
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  // Código em bloco: ```código```
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // Links: [texto](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Quebras de linha
  html = html.replace(/\n/g, '<br>');

  return html;
};

export const hasMarkdown = (text: string): boolean => {
  return /(\*\*|__|\*|_|`|\[.*?\]\(.*?\))/.test(text);
};



