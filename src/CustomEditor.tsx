import { Element, ElementProps } from "@/components/Element";
import { HoveringToolbar } from "@/components/HoveringToolbar";
import { LeafProps, Leaf } from "@/components/Leaf";
import { manipulateShiftTab, manipulateTab } from "@/helpers";
import React, { useCallback } from "react";
import { Editor } from "slate";
import { useSlate, Editable } from "slate-react";

export const CustomEditor = () => {
  const editor = useSlate();
  const renderElement = useCallback(
    (props: ElementProps) => <Element {...props} />,
    []
  );
  const renderLeaf = useCallback((props: LeafProps) => <Leaf {...props} />, []);

  console.log(editor.children);

  return (
    <>
      <HoveringToolbar />
      <Editable
        className="editor"
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        onBlur={() => {}}
        onKeyDown={(event) => {
          if (event.key.toLowerCase() === "tab") {
            event.preventDefault();

            if (event.shiftKey) {
              manipulateShiftTab(editor);
            } else {
              manipulateTab(editor);
            }
          }
          if (!event.ctrlKey) {
            return;
          }
          switch (event.key.toLowerCase()) {
            case "b": {
              event.preventDefault();
              Editor.addMark(editor, "bold", true);
              break;
            }
          }
        }}
      />
    </>
  );
};
