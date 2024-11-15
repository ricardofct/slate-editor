import { Portal } from "@/components/Portal";
import { toggleBlock, toggleMark } from "@/helpers";
import React, { useEffect, useRef, useState } from "react";
import { Editor, Range } from "slate";
import { useSlate, useFocused, useSelected } from "slate-react";

enum Type {
  PARAGRAPH = "paragraph",
  ORDERED_LIST = "ordered-list",
  UNORDERED_LIST = "unordered-list",
  LIST_ITEM = "list-item",
  LIST_ITEM_TEXT = "list-item-text",
}

export const HoveringToolbar = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const editor = useSlate();
  const inFocus = useFocused();
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);

  useEffect(() => {
    const el = ref.current;
    const { selection } = editor;

    if (!el) {
      return;
    }

    if (
      !selection ||
      !inFocus ||
      Range.isCollapsed(selection) ||
      Editor.string(editor, selection) === ""
    ) {
      setLeft(0);
      setTop(0);
      return;
    }

    const domSelection = window.getSelection();
    const domRange = domSelection?.getRangeAt(0);
    const rect = domRange?.getBoundingClientRect();
    setLeft(
      !rect
        ? 0
        : rect.left + window.scrollX - el.offsetWidth / 2 + rect.width / 2
    );
    setTop(!rect ? 0 : rect.top + window.scrollY - el.offsetHeight - 10);
  });

  return (
    <Portal>
      <div
        ref={ref}
        style={{
          position: "absolute",
          left,
          top,
          display: left > 0 && top > 0 ? "flex" : "none",
        }}
        onMouseDown={(e) => {
          // prevent toolbar from taking focus away from editor
          e.preventDefault();
        }}
      >
        {[
          { icon: "format_bold", type: "bold" },
          { icon: "format_italic", type: "italic" },
          { icon: "format_underlined", type: "underlined" },
          { icon: "format_strikethrough", type: "strikethrough" },
          { icon: "format_list_numbered", type: Type.ORDERED_LIST },
          { icon: "format_list_bulleted", type: Type.UNORDERED_LIST },
        ].map(({ icon, type }) => (
          <button
            key={icon}
            // isActive={isMarkActive(type)}
            onClick={(e) => {
              e.preventDefault();
              if (type === Type.ORDERED_LIST || type === Type.UNORDERED_LIST) {
                toggleBlock(editor, type);
              } else {
                toggleMark(editor, type);
              }
            }}
            style={{}}
          >
            <span className="material-symbols-outlined">{icon}</span>
          </button>
        ))}
      </div>
    </Portal>
  );
};
