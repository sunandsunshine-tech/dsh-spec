/**
 * Minimal mdast node types for the extracted documentation gates.
 *
 * The gates annotate parsed trees with `Nodes` from the mdast type definitions. This
 * file supplies the subset those annotations use, so the extracted scripts compile in a
 * project that does not install `@types/mdast`. It is a compatibility shim, not the
 * upstream type package: extend it when a gate starts reading a node field it does not
 * declare here.
 */

/** Position of one character in the source. */
export interface Point {
  /** 1-based line number. */
  line: number
  /** 1-based column number. */
  column: number
  /** 0-based character offset. */
  offset: number
}

/** Source span of a node. */
export interface Position {
  /** Inclusive start position. */
  start: Point
  /** Inclusive end position. */
  end: Point
}

/** Fields every mdast node carries. */
interface NodeBase {
  /** Discriminant tag selecting the node type. */
  type: string
  /** Source span, absent on synthesized nodes. */
  position?: Position
  /** Arbitrary node data. */
  data?: unknown
}

/**
 * Every mdast node type a documentation gate inspects, plus GFM table nodes. The
 * literal `type` field makes the union discriminable, which `Extract` relies on.
 */
export type Nodes =
  | (NodeBase & { type: 'root'; children: Nodes[] })
  | (NodeBase & { type: 'paragraph'; children: Nodes[] })
  | (NodeBase & { type: 'blockquote'; children: Nodes[] })
  | (NodeBase & { type: 'list'; children: Nodes[]; ordered?: boolean; start?: number; spread?: boolean })
  | (NodeBase & { type: 'listItem'; children: Nodes[]; spread?: boolean; checked?: boolean })
  | (NodeBase & { type: 'table'; children: Nodes[]; align?: (string | null)[] })
  | (NodeBase & { type: 'tableRow'; children: Nodes[] })
  | (NodeBase & { type: 'tableCell'; children: Nodes[] })
  | (NodeBase & { type: 'emphasis'; children: Nodes[] })
  | (NodeBase & { type: 'strong'; children: Nodes[] })
  | (NodeBase & { type: 'delete'; children: Nodes[] })
  | (NodeBase & { type: 'link'; children: Nodes[]; url: string; title?: string | null })
  | (NodeBase & { type: 'linkReference'; children: Nodes[]; identifier: string; label?: string | null; referenceType: string })
  | (NodeBase & { type: 'image'; url: string; alt?: string | null; title?: string | null; depth?: number })
  | (NodeBase & { type: 'imageReference'; identifier: string; alt?: string | null; label?: string | null; referenceType: string })
  | (NodeBase & { type: 'definition'; url: string; identifier: string; title?: string | null; label?: string | null })
  | (NodeBase & { type: 'footnoteDefinition'; children: Nodes[]; identifier: string; label?: string | null })
  | (NodeBase & { type: 'footnoteReference'; identifier: string; label?: string | null })
  | (NodeBase & { type: 'heading'; children: Nodes[]; depth: number })
  | (NodeBase & { type: 'code'; value: string; lang?: string | null; meta?: string | null })
  | (NodeBase & { type: 'inlineCode'; value: string })
  | (NodeBase & { type: 'html'; value: string; alt?: string | null; depth?: number })
  | (NodeBase & { type: 'text'; value: string })
  | (NodeBase & { type: 'thematicBreak' })
  | (NodeBase & { type: 'break' })
  | (NodeBase & { type: 'yaml'; value: string })
  /**
   * Any node type this shim does not name. The fields are required so a narrowed read
   * stays assignable to the gate's own interfaces; the gates only reach them after
   * checking `node.type`.
   */
  | (NodeBase & { children: Nodes[]; value: string; alt: string | null; depth: number; lang?: string | null; meta?: string | null; identifier: string })
