import { getCollection, type CollectionEntry } from 'astro:content'

export type Post = CollectionEntry<'posts'>
export const postPath = (post: Post) => '/' + post.id + '/'
export const postHref = (post: Post) => encodeURI(postPath(post))
export const thumbnail = (post: Post) => post.data.thumbnail.replace(/^\/blog\//, '/')
export const dateLabel = (date: Date) => date.toISOString().slice(0, 10).replaceAll('-', '.')
export const readingTime = (post: Post) => Math.max(1, Math.ceil((post.body?.length || 0) / 900))
export async function allPosts() {
  return (await getCollection('posts')).sort((a, b) =>
    b.data.date.getTime() - a.data.date.getTime() || b.data.title.localeCompare(a.data.title, 'ko'),
  )
}
