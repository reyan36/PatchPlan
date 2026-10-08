"use client";

import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { Trash2 } from "lucide-react";

const ImageComponent = ({ node, deleteNode }: any) => {
  return (
    <NodeViewWrapper className="relative group inline-block max-w-full my-4">
      <img
        src={node.attrs.src}
        alt={node.attrs.alt}
        className="max-w-full rounded-md border-2 border-transparent group-hover:border-primary transition-colors block"
      />
      <button
        onClick={deleteNode}
        className="absolute top-2 right-2 bg-red-500/90 text-white p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 shadow-md"
        title="Delete Image"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </NodeViewWrapper>
  );
};

export const CustomImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent);
  },
});
