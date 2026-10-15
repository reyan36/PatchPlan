"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useEffect, useState } from "react";
import { LinkSimple } from "@phosphor-icons/react";

const MentionComponent = ({ node, updateAttributes }: any) => {
  const { href, title, icon, domain } = node.attrs;
  const [loading, setLoading] = useState(!title);

  useEffect(() => {
    if (!title && href) {
      setLoading(true);
      fetch(`/api/metadata?url=${encodeURIComponent(href)}`)
        .then(res => res.json())
        .then(data => {
          updateAttributes({
            title: data.title,
            icon: data.icon,
            domain: data.domain
          });
        })
        .catch(() => {
          updateAttributes({ title: href });
        })
        .finally(() => setLoading(false));
    }
  }, [href, title, updateAttributes]);

  return (
    <NodeViewWrapper as="span" style={{ display: "inline" }}>
      <a 
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        contentEditable={false}
        className="hover:bg-muted/80 transition-colors cursor-pointer group"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "0 6px",
          margin: "0 4px",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "4px",
          fontSize: "0.85rem",
          fontWeight: 500,
          textDecoration: "none",
          color: "inherit",
          height: "24px",
          maxHeight: "24px",
          lineHeight: "24px",
          verticalAlign: "middle",
          boxSizing: "border-box",
          maxWidth: "100%",
          overflow: "hidden"
        }}
      >
        {loading ? (
          <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #6366f1', borderTopColor: 'transparent' }} className="animate-spin" />
        ) : icon ? (
          <img 
            src={icon} 
            alt="" 
            style={{ width: '14px', height: '14px', borderRadius: '2px', objectFit: 'contain' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }} 
          />
        ) : (
          <LinkSimple style={{ width: '14px', height: '14px', opacity: 0.7 }} className="group-hover:text-primary transition-colors" weight="bold" />
        )}
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }}>
          {loading ? "Fetching preview..." : title || href}
        </span>
      </a>
    </NodeViewWrapper>
  );
};

export const LinkMention = Node.create({
  name: 'linkMention',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      href: { default: null },
      title: { default: null },
      icon: { default: null },
      domain: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-mention]' }];
  },

  renderHTML({ HTMLAttributes }) {
    // We save the HTML output so it renders properly even if JS fails
    return ['a', mergeAttributes(HTMLAttributes, { 'data-mention': true, href: HTMLAttributes.href }), HTMLAttributes.title || HTMLAttributes.href];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MentionComponent);
  },
});
