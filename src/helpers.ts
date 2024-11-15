import escapeHtml from "escape-html";
import { jsx } from "slate-hyperscript";
import {
  BaseElement,
  BaseText,
  Descendant,
  Text as SlateText,
  Transforms,
  Editor,
  Element as SlateElement,
  Node as SlateNode,
  BaseEditor,
  Path,
} from "slate";

export enum Type {
  PARAGRAPH = "paragraph",
  ORDERED_LIST = "ordered-list",
  UNORDERED_LIST = "unordered-list",
  LIST_ITEM = "list-item",
  LIST_ITEM_TEXT = "list-item-text",
}

export const LIST_TYPES = [
  Type.ORDERED_LIST,
  Type.UNORDERED_LIST,
  Type.LIST_ITEM,
];

export const serialize = (n: Descendant) => {
  if (SlateText.isText(n)) {
    const node = n as BaseText & {
      bold?: boolean;
      italic?: boolean;
      underlined?: boolean;
      strikethrough?: boolean;
    };
    let string = escapeHtml(node.text);
    if (!string) {
      return "<br/>";
    }
    if (node.bold) {
      string = `<strong>${string}</strong>`;
    }
    if (node.italic) {
      string = `<em>${string}</em>`;
    }
    if (node.strikethrough) {
      string = `<s>${string}</s>`;
    }
    if (node.underlined) {
      string = `<u>${string}</u>`;
    }
    return string.replaceAll("\n", "<br/>");
  }

  const node = n as BaseElement & { type?: string; url?: string };
  const children: string = node.children
    ? node.children.map((n) => serialize(n)).join("")
    : "";

  switch (node.type) {
    case Type.PARAGRAPH:
      return `<p>${children}</p>`;
    case Type.LIST_ITEM:
      return `<li>${children}</li>`;
    case Type.UNORDERED_LIST:
      return `<ul>${children}</ul>`;
    case Type.ORDERED_LIST:
      return `<ol>${children}</ol>`;
    case Type.LIST_ITEM_TEXT:
      return `<span>${children}</span>`;
    default:
      return children;
  }
};

export const deserialize = (
  el: HTMLElement,
  markAttributes = {} as { bold?: boolean }
) => {
  if (el.nodeType === Node.TEXT_NODE && el.textContent?.trim()) {
    return jsx("text", markAttributes, el.textContent);
  } else if (el.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const nodeAttributes = { ...markAttributes };

  // define attributes for text nodes
  switch (el.nodeName) {
    case "STRONG":
      nodeAttributes.bold = true;
  }

  const children: (BaseText | BaseElement | Descendant[] | "\n" | null)[] =
    Array.from(el.childNodes)
      .map((node) => deserialize(node as HTMLElement, nodeAttributes))
      .flat();

  if (children.length === 0) {
    children.push(jsx("text", nodeAttributes, ""));
  }

  switch (el.nodeName) {
    case "BODY":
      return jsx("fragment", {}, children);
    case "SPAN":
      return jsx("element", { type: Type.LIST_ITEM_TEXT }, children);
    case "LI":
      return jsx("element", { type: Type.LIST_ITEM }, children);
    case "OL":
      return jsx("element", { type: Type.ORDERED_LIST }, children);
    case "UL":
      return jsx("element", { type: Type.UNORDERED_LIST }, children);
    case "P":
      return jsx("element", { type: Type.PARAGRAPH }, children);
    default:
      return children;
  }
};

export const toggleMark = (editor: BaseEditor, format: string) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

export const isMarkActive = (editor: BaseEditor, format: string) => {
  try {
    const marks = Editor.marks(editor) as Record<string, boolean>;
    return marks ? marks[format] === true : false;
  } catch (error) {
    console.warn(error);
    return false;
  }
};

export const isBlockActive = (
  editor: BaseEditor,
  format: Type,
  blockType = "type"
) => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) => {
        const block: SlateNode & { [key: string]: unknown } = n as SlateNode & {
          [key: string]: unknown;
        };
        return (
          !Editor.isEditor(block) &&
          SlateElement.isElement(block) &&
          block[blockType] === format
        );
      },
    })
  );

  return !!match;
};

export const toggleBlock = (editor: BaseEditor, format: Type) => {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: (n: SlateNode & { type?: Type }) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      !!n.type &&
      LIST_TYPES.includes(n.type),
    split: true,
  });

  Transforms.unwrapNodes(editor, {
    match: (n: SlateNode & { type?: Type }) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      !!n.type &&
      LIST_TYPES.includes(n.type),
    split: true,
  });

  const newProperties: Partial<SlateElement & { type: string }> = {
    type: isActive ? Type.PARAGRAPH : isList ? Type.LIST_ITEM_TEXT : format,
  };

  Transforms.setNodes<SlateElement>(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block);
    const block_item = { type: Type.LIST_ITEM, children: [] };
    Transforms.wrapNodes(editor, block_item);
  }
};

export const manipulateTab = (editor: BaseEditor) => {
  const { selection } = editor;

  if (!selection || selection.anchor.path.length >= 5) {
    return;
  }

  let format;
  if (isBlockActive(editor, LIST_TYPES[0])) {
    format = LIST_TYPES[0];
  } else if (isBlockActive(editor, LIST_TYPES[1])) {
    format = LIST_TYPES[1];
  } else {
    return;
  }

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) => {
        const block: SlateNode & { [key: string]: unknown } = n as SlateNode & {
          [key: string]: unknown;
        };
        return (
          !Editor.isEditor(block) &&
          SlateElement.isElement(block) &&
          block["type"] === Type.LIST_ITEM_TEXT
        );
      },
    })
  );
  // if (Path.hasPrevious())

  const parentPath = Path.parent(match[1]);
  if (!parent || !Path.hasPrevious(parentPath)) return;

  const previousParentPath = Path.previous(parentPath);
  if (previousParentPath) {
    // Transforms.moveNodes()
    const [previousParentPathChildAsList] = Array.from(
      Editor.nodes(editor, {
        at: previousParentPath,
        match: (n, path) => {
          const block: SlateNode & { [key: string]: unknown } =
            n as SlateNode & {
              [key: string]: unknown;
            };
          return (
            !Editor.isEditor(block) &&
            SlateElement.isElement(block) &&
            Path.isChild(path, previousParentPath) &&
            (block["type"] === Type.ORDERED_LIST ||
              block["type"] === Type.UNORDERED_LIST)
          );
        },
      })
    );
    if (previousParentPathChildAsList) {
      Transforms.moveNodes(editor, {
        at: parentPath,
        to: [
          ...previousParentPathChildAsList[1],
          (previousParentPathChildAsList[0] as BaseElement).children.length,
        ],
      });

      const next = [
        ...previousParentPathChildAsList[1],
        (previousParentPathChildAsList[0] as BaseElement).children.length,
      ];

      // Elementos filhos fazem merge com a lista do pai e pai é eliminado
      // 1 ol                      1 ol                  1 ol
      //  1.1 li                    1.1 li                1.1 li
      //  1.2 li                    1.2 li                1.2 li
      // 2 ol <- movido             1.3 ol  <- movido     1.3 ol <- eliminado
      //  2.1 li <- movido            1.3.1               1.4 li <- movido
      //  2.2 li <- movido            1.3.2               1.5 li <- movido
      //

      const node = Editor.node(editor, next)?.[0] as BaseElement | undefined;

      if (
        selection.anchor.path.length >= 4 &&
        node?.children &&
        node?.children?.length > 1
      ) {
        const toDelete = Editor.node(editor, [...next, 1]);
        const parentNode = Editor.node(
          editor,
          [...next].splice(0, next.length - 1)
        );

        if (!toDelete || !parentNode) return;

        (toDelete[0] as BaseElement | undefined)?.children.forEach((v, i) => {
          Transforms.moveNodes(editor, {
            at: [...toDelete[1], 0],
            to: [
              ...parentNode[1],
              (parentNode[0] as BaseElement)?.children.length,
            ],
          });
        });

        Transforms.delete(editor, { at: [...next, 1] });
      }
    } else {
      const [previousParentPathChild] = Array.from(
        Editor.nodes(editor, {
          at: previousParentPath,
          match: (n) => {
            const block: SlateNode & { [key: string]: unknown } =
              n as SlateNode & {
                [key: string]: unknown;
              };
            return (
              !Editor.isEditor(block) &&
              SlateElement.isElement(block) &&
              block["type"] === Type.LIST_ITEM_TEXT
            );
          },
        })
      );

      const newProperties: { type: string; children: Descendant[] } = {
        type: format,
        children: [],
      };
      Transforms.wrapNodes<SlateElement>(editor, newProperties, {
        at: parentPath,
      });

      const next = Path.next(previousParentPathChild[1]);

      Transforms.moveNodes(editor, {
        at: parentPath,
        to: next,
      });

      // Elementos filhos fazem merge com a lista do pai e pai é eliminado
      // 1 ol                   1 ol <- pai sem filhos é eliminado
      //  1.1 li <- movido      2 li
      //  1.2 li < - movido     3 li
      //

      const node = Editor.node(editor, next)?.[0] as BaseElement | undefined;

      if (
        selection.anchor.path.length >= 4 &&
        node?.children[0] &&
        (node.children[0] as BaseElement)?.children.length > 1
      ) {
        const toDelete = Editor.node(editor, [...next, 0, 1])?.[0] as
          | BaseElement
          | undefined;

        toDelete?.children.forEach((v, i) => {
          Transforms.moveNodes(editor, {
            at: [...next, 0, 1, 0],
            to: [
              ...[...next].splice(0, next.length - 1),
              node.children.length,
              ((node.children[0] as BaseElement)?.children[1] as BaseElement)
                .children.length,
            ],
          });
        });

        Transforms.delete(editor, { at: [...next, 0, 1] });
      }
    }
  }
};

export const manipulateShiftTab = (editor: BaseEditor) => {
  const { selection } = editor;
  if (selection) {
    const [match] = Editor.nodes(editor, {
      reverse: true,
      match: (n: SlateNode & { type?: Type }) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        !!n.type &&
        n.type === Type.LIST_ITEM_TEXT,
    });

    if (match) {
      const parent = Path.parent(match[1]);

      if (!((match[0] as BaseElement).children[0] as { text: string }).text) {
        Transforms.moveNodes(editor, {
          at: parent,
          to: [...parent].slice(0, -2),
        });
        return;
      }
    }
  }
};
