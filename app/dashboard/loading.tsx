export default function DashboardLoading() {
  return <div className="route-loading" aria-label="Loading page"><div className="loading-line loading-title" /><div className="loading-line loading-copy" /><div className="loading-metrics">{[0,1,2,3].map((item) => <div key={item} />)}</div><div className="loading-panel" /></div>;
}
