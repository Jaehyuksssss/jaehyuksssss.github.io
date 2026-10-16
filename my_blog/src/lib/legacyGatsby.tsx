import { type AnchorHTMLAttributes, type ReactNode } from 'react'
import { navigate } from './navigation'

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  to: string
  children?: ReactNode
}

/**
 * Compatibility helpers for source files retained from the Gatsby version.
 * Astro does not execute their GraphQL queries, but keeping these helpers lets
 * the archived React source remain type-safe without installing Gatsby.
 */
export function Link({ to, children, ...props }: LinkProps) {
  return <a href={to} {...props}>{children}</a>
}

export { navigate }

export function graphql(strings: TemplateStringsArray, ...values: unknown[]) {
  return strings.reduce((query, part, index) => query + part + (values[index] ?? ''), '')
}

export function useStaticQuery(_query: unknown) {
  return {
    site: {
      siteMetadata: {
        title: '재혁의 엔지니어링 노트',
        description: '데브옵스 엔지니어 임재혁의 기술 블로그',
        author: '임재혁',
        siteUrl: 'https://jaehyuksssss.github.io',
      },
    },
  }
}
