import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

export function ContentState({ loading, error, retry }: { loading: boolean; error: string | null; retry: () => void }) {
  return <div className="content-state" role="status">{loading ? <><span className="loading-orbit" /><p>Gathering a few little things…</p></> : <><h1>暂时没有加载成功</h1><p>{error}</p><button className="primary-button" onClick={retry}>重新加载</button></>}</div>
}
export function NotFound({ message = '这里还没有内容，先回到熟悉的地方吧。' }: { message?: string }) {
  return <main className="content-state"><span className="not-found-number">404</span><h1>Lost in orbit?</h1><p>{message}</p><Link className="primary-button" to="/">回到主页 <ArrowUpRight size={18} /></Link></main>
}
