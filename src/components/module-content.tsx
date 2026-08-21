/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from 'react'

type ContentMark = {
  type?: string
  attrs?: Record<string, unknown>
}

type ContentNode = {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: ContentMark[]
  content?: ContentNode[]
}

type ContentDocument = ContentNode & {
  type: 'doc'
  content: ContentNode[]
}

function parseContent(value: string): ContentDocument | null {
  if (!value.startsWith('{"type":"doc"')) return null
  try {
    const parsed = JSON.parse(value) as ContentDocument
    return parsed.type === 'doc' && Array.isArray(parsed.content) ? parsed : null
  } catch {
    return null
  }
}

const safeUrl = (value: unknown, protocols: string[]) => {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return protocols.includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

function markedText(node: ContentNode, key: string): ReactNode {
  let result: ReactNode = node.text ?? ''
  for (const [index, mark] of (node.marks ?? []).entries()) {
    const markKey = `${key}-mark-${index}`
    if (mark.type === 'bold') result = <strong key={markKey}>{result}</strong>
    else if (mark.type === 'italic') result = <em key={markKey}>{result}</em>
    else if (mark.type === 'underline') result = <u key={markKey}>{result}</u>
    else if (mark.type === 'strike') result = <s key={markKey}>{result}</s>
    else if (mark.type === 'code') result = <code key={markKey}>{result}</code>
    else if (mark.type === 'link') {
      const href = safeUrl(mark.attrs?.href, ['http:', 'https:', 'mailto:'])
      if (href)
        result = (
          <a
            key={markKey}
            href={href}
            target={href.startsWith('mailto:') ? undefined : '_blank'}
            rel="noreferrer"
          >
            {result}
          </a>
        )
    }
  }
  return result
}

function alignment(node: ContentNode): CSSProperties | undefined {
  const textAlign = node.attrs?.textAlign
  return ['left', 'center', 'right', 'justify'].includes(String(textAlign))
    ? { textAlign: textAlign as CSSProperties['textAlign'] }
    : undefined
}

function renderNodes(nodes: ContentNode[] | undefined, parentKey: string): ReactNode[] {
  return (nodes ?? []).map((node, index) => renderNode(node, `${parentKey}-${index}`))
}

function renderNode(node: ContentNode, key: string): ReactNode {
  if (node.type === 'text') return markedText(node, key)
  if (node.type === 'hardBreak') return <br key={key} />
  if (node.type === 'horizontalRule') return <hr key={key} />
  const children = renderNodes(node.content, key)
  if (node.type === 'paragraph')
    return (
      <p key={key} style={alignment(node)}>
        {children.length ? children : <br />}
      </p>
    )
  if (node.type === 'heading') {
    const level = Number(node.attrs?.level)
    if (level === 1)
      return (
        <h1 key={key} style={alignment(node)}>
          {children}
        </h1>
      )
    if (level === 3)
      return (
        <h3 key={key} style={alignment(node)}>
          {children}
        </h3>
      )
    return (
      <h2 key={key} style={alignment(node)}>
        {children}
      </h2>
    )
  }
  if (node.type === 'bulletList') return <ul key={key}>{children}</ul>
  if (node.type === 'orderedList') {
    const start = Number(node.attrs?.start)
    return (
      <ol key={key} start={Number.isSafeInteger(start) && start > 0 ? start : undefined}>
        {children}
      </ol>
    )
  }
  if (node.type === 'listItem') return <li key={key}>{children}</li>
  if (node.type === 'blockquote') return <blockquote key={key}>{children}</blockquote>
  if (node.type === 'codeBlock')
    return (
      <pre key={key}>
        <code>{children}</code>
      </pre>
    )
  if (node.type === 'image') {
    const src = safeUrl(node.attrs?.src, ['https:'])
    return src ? (
      <figure key={key}>
        <img
          src={src}
          alt={typeof node.attrs?.alt === 'string' ? node.attrs.alt : ''}
          loading="lazy"
        />
        {typeof node.attrs?.title === 'string' && node.attrs.title ? (
          <figcaption>{node.attrs.title}</figcaption>
        ) : null}
      </figure>
    ) : null
  }
  if (node.type === 'table')
    return (
      <div className="lr-rich-table" key={key}>
        <table>
          <tbody>{children}</tbody>
        </table>
      </div>
    )
  if (node.type === 'tableRow') return <tr key={key}>{children}</tr>
  if (node.type === 'tableHeader') return <th key={key}>{children}</th>
  if (node.type === 'tableCell') return <td key={key}>{children}</td>
  return <span key={key}>{children}</span>
}

export function ModuleContent({ value }: { value: string }) {
  const document = parseContent(value)
  if (!document)
    return <div className="lr-rich-module-content lr-rich-module-content--legacy">{value}</div>
  return <div className="lr-rich-module-content">{renderNodes(document.content, 'module')}</div>
}
