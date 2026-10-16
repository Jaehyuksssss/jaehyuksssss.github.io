import useSupabaseTotalViews from '../../src/hooks/useSupabaseTotalViews'

export default function TotalViews() {
  const { total, loading, error } = useSupabaseTotalViews()
  const value = total === null ? '—' : total.toLocaleString('ko-KR')

  return (
    <div
      className="total-views"
      aria-live="polite"
      title={error ? '방문수를 불러오지 못했습니다.' : undefined}
    >
      <span className="total-views-dot" aria-hidden="true" />
      <span className="total-views-label">누적 방문</span>
      <strong>{loading ? '…' : value}</strong>
    </div>
  )
}
