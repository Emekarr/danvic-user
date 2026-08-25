/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { apiFetch, type Attachment } from '@danvic/api-client'

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

const safeColor = (value: unknown) =>
  typeof value === 'string' && /^#[\da-f]{3,8}$/iu.test(value) ? value : undefined

const safeTextStyle = (attrs: Record<string, unknown> | undefined): CSSProperties => {
  const allowedFonts = new Set([
    'Arial, Helvetica, sans-serif',
    'Georgia, serif',
    '"Times New Roman", Times, serif',
    'Verdana, Geneva, sans-serif',
    '"Courier New", Courier, monospace',
  ])
  const allowedSizes = new Set(['12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px'])
  const allowedLineHeights = new Set(['1', '1.15', '1.5', '2'])
  return {
    color: safeColor(attrs?.color),
    backgroundColor: safeColor(attrs?.backgroundColor),
    fontFamily:
      typeof attrs?.fontFamily === 'string' && allowedFonts.has(attrs.fontFamily)
        ? attrs.fontFamily
        : undefined,
    fontSize:
      typeof attrs?.fontSize === 'string' && allowedSizes.has(attrs.fontSize)
        ? attrs.fontSize
        : undefined,
    lineHeight:
      typeof attrs?.lineHeight === 'string' && allowedLineHeights.has(attrs.lineHeight)
        ? attrs.lineHeight
        : undefined,
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
    else if (mark.type === 'subscript') result = <sub key={markKey}>{result}</sub>
    else if (mark.type === 'superscript') result = <sup key={markKey}>{result}</sup>
    else if (mark.type === 'textStyle')
      result = (
        <span key={markKey} style={safeTextStyle(mark.attrs)}>
          {result}
        </span>
      )
    else if (mark.type === 'highlight')
      result = (
        <mark key={markKey} style={{ backgroundColor: safeColor(mark.attrs?.color) }}>
          {result}
        </mark>
      )
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

type ModuleContentOptions = {
  courseId?: string
  attachmentsByPath: Map<string, Attachment>
}

function renderNodes(
  nodes: ContentNode[] | undefined,
  parentKey: string,
  options: ModuleContentOptions,
): ReactNode[] {
  return (nodes ?? []).map((node, index) => renderNode(node, `${parentKey}-${index}`, options))
}

function renderNode(node: ContentNode, key: string, options: ModuleContentOptions): ReactNode {
  if (node.type === 'text') return markedText(node, key)
  if (node.type === 'hardBreak') return <br key={key} />
  if (node.type === 'horizontalRule') return <hr key={key} />
  const children = renderNodes(node.content, key, options)
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
  if (node.type === 'taskList')
    return (
      <ul className="lr-rich-task-list" key={key}>
        {children}
      </ul>
    )
  if (node.type === 'taskItem')
    return (
      <li className="lr-rich-task-item" key={key}>
        <input
          type="checkbox"
          checked={node.attrs?.checked === true}
          readOnly
          aria-label="Checklist item"
        />
        <div>{children}</div>
      </li>
    )
  if (node.type === 'blockquote') return <blockquote key={key}>{children}</blockquote>
  if (node.type === 'codeBlock')
    return (
      <pre key={key}>
        <code>{children}</code>
      </pre>
    )
  if (node.type === 'image') {
    const src = safeUrl(node.attrs?.src, ['http:', 'https:'])
    const attachmentPath =
      typeof node.attrs?.attachmentPath === 'string' ? node.attrs.attachmentPath : undefined
    const attachment = attachmentPath ? options.attachmentsByPath.get(attachmentPath) : undefined
    if (attachment && options.courseId)
      return (
        <figure key={key}>
          <PrivateModuleImage
            courseId={options.courseId}
            attachmentId={attachment.id}
            fallbackSrc={src}
            alt={typeof node.attrs?.alt === 'string' ? node.attrs.alt : ''}
          />
          {typeof node.attrs?.title === 'string' && node.attrs.title ? (
            <figcaption>{node.attrs.title}</figcaption>
          ) : null}
        </figure>
      )
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

function PrivateModuleImage({
  courseId,
  attachmentId,
  fallbackSrc,
  alt,
}: {
  courseId: string
  attachmentId: string
  fallbackSrc: string | null
  alt: string
}) {
  const [src, setSrc] = useState(fallbackSrc)
  useEffect(() => {
    let active = true
    void apiFetch<{ viewUrl: string }>(
      `/api/courses/${encodeURIComponent(courseId)}/attachments/${encodeURIComponent(attachmentId)}/view`,
    )
      .then((result) => {
        if (active) setSrc(result.viewUrl)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [attachmentId, courseId])
  return src ? <img src={src} alt={alt} loading="lazy" /> : <span>Image unavailable.</span>
}

export function ModuleContent({
  value,
  courseId,
  attachments = [],
}: {
  value: string
  courseId?: string
  attachments?: Attachment[]
}) {
  const document = parseContent(value)
  if (!document)
    return <div className="lr-rich-module-content lr-rich-module-content--legacy">{value}</div>
  const options: ModuleContentOptions = {
    attachmentsByPath: new Map(
      attachments.map((attachment) => [attachment.attachmentPath, attachment]),
    ),
    ...(courseId ? { courseId } : {}),
  }
  return (
    <div className="lr-rich-module-content">{renderNodes(document.content, 'module', options)}</div>
  )
}
