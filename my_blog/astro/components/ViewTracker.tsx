import useSupabaseViewCount from '../../src/hooks/useSupabaseViewCount'
import useGTMViewCount from '../../src/hooks/useGTMViewCount'

export default function ViewTracker({ slug }: { slug: string }) {
  useSupabaseViewCount(slug, { coolDownMinutes: 60 * 24, globalCoolDown: true })
  useGTMViewCount(slug)
  return null
}
