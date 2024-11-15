import { Type } from "@/helpers";
import { BaseElement } from "slate";
import { RenderElementProps } from "slate-react";

export interface ElementProps extends RenderElementProps {
  element: BaseElement & { align?: string; type?: string };
}

export const Element = ({ attributes, children, element }: ElementProps) => {
  const style = { textAlign: element.align } as React.CSSProperties;
  switch (element.type) {
    case Type.UNORDERED_LIST:
      return (
        <ul style={style} {...attributes}>
          {children}
        </ul>
      );
    case Type.LIST_ITEM:
      return (
        <li style={style} {...attributes}>
          {children}
        </li>
      );
    case Type.ORDERED_LIST:
      return (
        <ol style={style} {...attributes}>
          {children}
        </ol>
      );
    case Type.LIST_ITEM_TEXT:
      return (
        <span style={style} {...attributes}>
          {children}
        </span>
      );
    default:
      return (
        <p style={style} {...attributes}>
          {children}
        </p>
      );
  }
};
