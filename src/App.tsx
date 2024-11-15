import { useState } from "react";
import "./App.css";
import { ReactEditor, Slate, withReact } from "slate-react";
import {
  BaseElement,
  createEditor,
  Descendant,
  Editor,
  Node,
  Path,
  Range,
  Element as SlateElement,
  Transforms,
} from "slate";
import { withHistory } from "slate-history";
import { CustomEditor } from "@/CustomEditor";
import { deserialize, LIST_TYPES, serialize, Type } from "@/helpers";
{
  /* <li>
<span></span>
<ol>
  <li><span>1</span></li>
  <li><span>2</span></li>
  <li><span>3</span></li>
</ol>
</li> */
}

function App() {
  const [html, setHtml] = useState(`
    <div>
      <p>Text 1</p> <p>Text 2</p>
      <ol>
        <li><span>1</span></li>
        <li><span>2</span></li>
        <li><span>3</span></li>
        <li><span>4</span></li>
        <li>
          <span></span>
          <ol>
            <li><span>1</span></li>
            <li><span>2</span></li>
            <li><span>3</span></li>
            <li><span>4</span></li>
            <li><span>5</span></li>
          </ol>
        </li>
      </ol>
    </div>
    `);
  const [editing, setEditing] = useState(false);
  const [editor] = useState(() =>
    withCustomDelete(withHistory(withReact(createEditor())))
  );

  const document = new DOMParser().parseFromString(html ?? "", "text/html");
  const editorInitialValue = deserialize(document.body);

  return (
    <>
      {/* {html} */}
      {!editing && (
        <div
          style={{
            width: 400,
            height: 200,
            background: "rgba(0,0,0,0.1)",
            overflow: "auto",
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      {!editing && <button onClick={() => setEditing(true)}>Edit</button>}
      {editing && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Slate
            editor={editor as ReactEditor}
            initialValue={editorInitialValue as Descendant[]}
          >
            <CustomEditor />
          </Slate>
          <button
            onClick={() => {
              setHtml(
                `<div>${editor.children
                  .map((n) => serialize(n))
                  .join("")}</div>`
              );
              editor.deselect();
              setEditing(false);
            }}
          >
            Save
          </button>
        </div>
      )}
    </>
  );
}

export default App;

const withCustomDelete = (editor: Editor) => {
  const { deleteBackward, deleteFragment, insertBreak, splitNodes } = editor;

  editor.deleteBackward = (...args) => {
    const { selection } = editor;
    debugger;
    if (
      selection &&
      Range.isCollapsed(selection) &&
      selection.anchor.offset === 0
    ) {
      const [match] = Editor.nodes(editor, {
        reverse: true,
        match: (n: Node & { type?: Type }) =>
          !Editor.isEditor(n) &&
          SlateElement.isElement(n) &&
          !!n.type &&
          n.type === Type.LIST_ITEM_TEXT,
      });
      if (!match) {
        deleteBackward(...args);
        return;
      }

      const parent = Editor.parent(editor, match[1]);
      const nextOfParent = Editor.next(editor, { at: parent[1] });

      if (match && !Path.hasPrevious(parent[1]) && !nextOfParent) {
        Transforms.unwrapNodes(editor, {
          match: (n: Node & { type?: Type }) =>
            !Editor.isEditor(n) &&
            SlateElement.isElement(n) &&
            !!n.type &&
            LIST_TYPES.includes(n.type),
        });
        Transforms.unwrapNodes(editor, {
          match: (n: Node & { type?: Type }) =>
            !Editor.isEditor(n) &&
            SlateElement.isElement(n) &&
            !!n.type &&
            LIST_TYPES.includes(n.type),
        });
      }
    }

    deleteBackward(...args);
  };

  editor.deleteFragment = () => {
    const { selection } = editor;

    if (
      selection &&
      Range.isCollapsed(selection) &&
      selection.anchor.offset === 0
    ) {
      const [match] = Editor.nodes(editor, {
        reverse: true,
        match: (n: Node & { type?: Type }) =>
          !Editor.isEditor(n) &&
          SlateElement.isElement(n) &&
          !!n.type &&
          n.type === Type.LIST_ITEM_TEXT,
      });

      const parent = Editor.parent(editor, match[1]);
      const nextOfParent = Editor.next(editor, { at: parent[1] });

      if (match && !Path.hasPrevious(parent[1]) && !nextOfParent) {
        Transforms.unwrapNodes(editor, {
          match: (n: Node & { type?: Type }) =>
            !Editor.isEditor(n) &&
            SlateElement.isElement(n) &&
            !!n.type &&
            LIST_TYPES.includes(n.type),
        });
        Transforms.unwrapNodes(editor, {
          match: (n: Node & { type?: Type }) =>
            !Editor.isEditor(n) &&
            SlateElement.isElement(n) &&
            !!n.type &&
            LIST_TYPES.includes(n.type),
        });
      }
    }

    deleteFragment();
  };

  editor.insertBreak = () => {
    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
      const [match] = Editor.nodes(editor, {
        reverse: true,
        match: (n: Node & { type?: Type }) =>
          !Editor.isEditor(n) &&
          SlateElement.isElement(n) &&
          !!n.type &&
          n.type === Type.LIST_ITEM_TEXT,
      });
      if (match) {
        const parent = Path.parent(match[1]);

        if (!((match[0] as BaseElement).children[0] as { text: string }).text) {
          if (Editor.next(editor, { at: parent })) {
            Transforms.splitNodes(editor, { at: Path.next(parent) });

            const afterTextElement = editor.after(parent);
            if (afterTextElement?.path) {
              const afterPathList = [...afterTextElement.path].slice(0, -3);
              Transforms.moveNodes(editor, {
                at: afterPathList,
                to: [...parent, 1],
              });
              editor.setSelection({
                anchor: {
                  offset: 0,
                  path: parent,
                },
                focus: {
                  offset: 0,
                  path: parent,
                },
              });
            }
          }

          if (parent.length === 2) {
            const node = Editor.node(editor, parent);
            const next = Path.next([parent[0]]);
            if (node && (node[0] as SlateElement).children[1]) {
              Transforms.moveNodes(editor, {
                at: [...parent, 1],
                to: Path.next(next),
              });
            }
            Transforms.moveNodes(editor, {
              at: parent,
              to: Path.next([parent[0]]),
            });
            Transforms.unwrapNodes(editor);
            const newProperties: Partial<SlateElement & { type: string }> = {
              type: Type.PARAGRAPH,
            };
            Transforms.setNodes(editor, newProperties);

            const path = Path.next([...parent].slice(0, -1));
            // debugger;
            editor.setSelection({
              anchor: {
                offset: 0,
                path: [...path, 0],
              },
              focus: {
                offset: 0,
                path: [...path, 0],
              },
            });
          }

          if (parent.length > 2) {
            const next = Path.next([...parent].slice(0, -2));
            Transforms.moveNodes(editor, {
              at: parent,
              to: Path.next([...parent].slice(0, -2)),
            });
            editor.setSelection({
              anchor: {
                offset: 0,
                path: [...next, 0, 0],
              },
              focus: {
                offset: 0,
                path: [...next, 0, 0],
              },
            });
          }
          return;
        }

        const next = Path.next(parent);

        const newProperties: {
          type: string;
          children: { type: string; children: Descendant[] }[];
        } = {
          type: Type.LIST_ITEM,
          children: [
            {
              type: Type.LIST_ITEM_TEXT,
              children: [
                {
                  text: "",
                },
              ],
            },
          ],
        };
        Transforms.insertNodes(editor, newProperties, { at: next });
        editor.setSelection({
          anchor: {
            offset: 0,
            path: [...next, 0, 0],
          },
          focus: {
            offset: 0,
            path: [...next, 0, 0],
          },
        });
        return;
      }
    }

    insertBreak();
  };
  editor.splitNodes = (options) => {
    splitNodes(options);
  };

  return editor;
};
