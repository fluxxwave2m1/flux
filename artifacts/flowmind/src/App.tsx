import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Route, Switch, Link, useLocation, useRoute } from 'wouter';
import {
  Activity, AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Blocks, Bot, Check,
  ChevronDown, ChevronRight, CircleHelp, Clock3, Code2, Command, Copy, Eye, FileClock, Filter,
  GitBranch, Globe2, LayoutDashboard, LoaderCircle, LockKeyhole, MoreHorizontal, Pause,
  Play, Plus, Search, Settings2, ShieldCheck, Sparkles, Terminal, Trash2, Webhook, Workflow as WorkflowIcon,
  Zap, X, RefreshCw, SlidersHorizontal
} from 'lucide-react';
import {
  useGetFlowmindDashboard, useListFlowmindWorkflows, useCreateFlowmindWorkflow,
  useGenerateFlowmindWorkflow, useGetFlowmindWorkflow, useUpdateFlowmindWorkflow,
  useDeleteFlowmindWorkflow, useRunFlowmindWorkflow, useListFlowmindExecutions,
  useGetFlowmindExecution, useListFlowmindTemplates, useUseFlowmindTemplate,
  getGetFlowmindDashboardQueryKey, getListFlowmindWorkflowsQueryKey,
  getListFlowmindExecutionsQueryKey, getGetFlowmindWorkflowQueryKey,
  getGetFlowmindExecutionQueryKey
} from '@workspace/api-client-react';
import type { Workflow, WorkflowInput, WorkflowNode, WorkflowTemplate, Execution } from '@workspace/api-client-react';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import './index.css';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

const nav = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/workflows', label: 'Workflows', icon: WorkflowIcon },
  { href: '/executions', label: 'Executions', icon: Activity },
  { href: '/templates', label: 'Templates', icon: Blocks },
];
const secondaryNav = [
  { href: '/integrations', label: 'Integrations', icon: Webhook },
  { href: '/settings', label: 'Settings', icon: Settings2 },
];

function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const active = (href: string) => href === '/' ? loc === '/' : loc.startsWith(href);
  return <div className="min-h-[100dvh] bg-background text-foreground">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[238px] flex-col border-r border-[#20253a] bg-[#0b0e19] lg:flex">
      <Link href="/" className="flex h-[76px] items-center gap-3 border-b border-[#20253a] px-6 no-underline">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/10 text-blue-300"><WorkflowIcon size={18}/></span>
        <span className="text-[16px] font-extrabold tracking-[-.04em] text-slate-100">flowmind<span className="text-blue-400">.</span></span>
      </Link>
      <div className="px-4 pt-7">
        <p className="mb-3 px-3 font-mono text-[9px] font-medium uppercase tracking-[.19em] text-slate-600">Workspace</p>
        <div className="mb-7 flex items-center gap-3 rounded-xl border border-[#252a3d] bg-[#111523] p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-violet-500/20 text-[11px] font-bold text-blue-200">N</div>
          <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold text-slate-200">Northstar Studio</div><div className="mt-0.5 text-[10px] text-slate-500">Team workspace</div></div>
          <ChevronDown size={13} className="text-slate-600"/>
        </div>
        <p className="mb-2 px-3 font-mono text-[9px] font-medium uppercase tracking-[.19em] text-slate-600">Build</p>
        <nav className="space-y-1">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase()}`} className={`group flex items-center gap-3 rounded-lg px-3 py-[10px] text-[12px] font-semibold transition-colors ${active(href) ? 'bg-blue-500/10 text-blue-300' : 'text-slate-500 hover:bg-white/[.035] hover:text-slate-200'}`}>
          <Icon size={16} strokeWidth={1.8}/>{label}{label === 'Executions' && <span className="ml-auto rounded bg-[#1a2031] px-1.5 py-0.5 font-mono text-[9px] text-slate-500">LIVE</span>}
        </Link>)}</nav>
        <p className="mb-2 mt-8 px-3 font-mono text-[9px] font-medium uppercase tracking-[.19em] text-slate-600">Configure</p>
        <nav className="space-y-1">{secondaryNav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase()}`} className={`flex items-center gap-3 rounded-lg px-3 py-[10px] text-[12px] font-semibold transition-colors ${active(href) ? 'bg-blue-500/10 text-blue-300' : 'text-slate-500 hover:bg-white/[.035] hover:text-slate-200'}`}><Icon size={16} strokeWidth={1.8}/>{label}</Link>)}</nav>
      </div>
      <div className="mt-auto p-4">
        <div className="mb-4 rounded-xl border border-blue-400/15 bg-[linear-gradient(140deg,rgba(59,130,246,.09),rgba(130,91,232,.06))] p-3.5">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-slate-200"><ShieldCheck size={14} className="text-blue-300"/> Simulation mode</div>
          <p className="text-[10px] leading-[1.6] text-slate-500">Runs use sample data. No external actions are performed.</p>
        </div>
        <div className="flex items-center gap-3 border-t border-[#20253a] px-2 pt-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#313951] bg-[#171d2c] text-[10px] font-bold text-slate-300">AS</div>
          <div className="flex-1"><p className="text-[11px] font-semibold text-slate-300">Alex Morgan</p><p className="text-[10px] text-slate-600">Workspace admin</p></div>
          <button aria-label="Account options" className="text-slate-600 hover:text-slate-300"><MoreHorizontal size={17}/></button>
        </div>
      </div>
    </aside>
    <div className="lg:pl-[238px]">
      <header className="sticky top-0 z-20 flex h-[64px] items-center justify-between border-b border-[#20253a] bg-[#0b0e19]/90 px-5 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-2 text-[11px] text-slate-600"><span className="hidden sm:inline">Northstar Studio</span><ChevronRight size={13} className="hidden sm:block"/><span className="text-slate-400">{nav.find(x=>active(x.href))?.label ?? secondaryNav.find(x=>active(x.href))?.label ?? (loc.includes('/builder') ? 'Workflow builder' : loc.includes('/executions/') ? 'Execution detail' : 'Create workflow')}</span></div>
        <div className="flex items-center gap-2 sm:gap-4"><div className="hidden items-center gap-2 rounded-md border border-[#252a3b] bg-[#111523] px-2.5 py-1.5 text-[10px] text-slate-500 sm:flex"><Command size={11}/> <span>Quick search</span><kbd className="ml-3 rounded border border-[#30364b] px-1 font-mono text-[9px]">⌘ K</kbd></div><button className="relative rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-slate-300" aria-label="Help"><CircleHelp size={16}/></button><span className="h-6 w-px bg-[#252a3b]"/><div className="flex items-center gap-2 text-[10px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>All systems operational</div></div>
      </header>
      <main className="mx-auto min-h-[calc(100dvh-64px)] max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10">{children}</main>
    </div>
    <MobileNav active={active}/>
  </div>;
}
function MobileNav({ active }: { active: (h:string)=>boolean }) {
  return <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-[#24293b] bg-[#0b0e19]/95 px-2 py-2 backdrop-blur-lg lg:hidden">{[...nav.slice(0,3),secondaryNav[1]].map(({href,label,icon:Icon})=><Link key={href} href={href} className={`flex min-w-[58px] flex-col items-center gap-1 py-1 text-[9px] font-semibold ${active(href)?'text-blue-300':'text-slate-600'}`}><Icon size={17}/>{label}</Link>)}</nav>;
}
function PageHeading({ eyebrow, title, subtitle, right }: { eyebrow?: string; title:string; subtitle?:string; right?:ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end fade-up"><div>{eyebrow&&<p className="mb-2 font-mono text-[9px] uppercase tracking-[.2em] text-blue-400">{eyebrow}</p>}<h1 className="text-[27px] font-bold tracking-[-.045em] text-slate-100 sm:text-[32px]">{title}</h1>{subtitle&&<p className="mt-2 max-w-2xl text-[12px] leading-5 text-slate-500">{subtitle}</p>}</div>{right&&<div className="flex shrink-0 items-center gap-2">{right}</div>}</div>;
}
function Button({ children, onClick, variant='primary', disabled, className='', type='button' }: {children:ReactNode;onClick?:()=>void;variant?:'primary'|'quiet'|'outline'|'danger';disabled?:boolean;className?:string;type?:'button'|'submit'}) {
  const styles = {primary:'border border-blue-400/30 bg-blue-500 text-[#07101e] hover:bg-blue-400',quiet:'border border-transparent bg-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200',outline:'border border-[#30364b] bg-[#121624] text-slate-300 hover:border-[#47516d] hover:bg-[#171c2b]',danger:'border border-rose-500/25 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15'};
  return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-[11px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}>{children}</button>;
}
function ErrorState({ retry, label='We couldn’t load this view.' }: {retry:()=>void;label?:string}) { return <div className="panel flex min-h-52 flex-col items-center justify-center rounded-2xl p-8 text-center"><AlertTriangle size={20} className="mb-3 text-amber-300"/><p className="text-sm font-semibold text-slate-200">{label}</p><p className="mt-1 text-[11px] text-slate-500">Check your connection and try again.</p><Button variant="outline" className="mt-4" onClick={retry}><RefreshCw size={13}/>Try again</Button></div>; }
function Skeleton({ rows=4 }: {rows?:number}) { return <div className="space-y-3" aria-label="Loading"><div className="h-28 animate-pulse rounded-xl border border-[#20253a] bg-[#111523]"/>{Array.from({length:rows},(_,i)=><div key={i} className="h-14 animate-pulse rounded-xl border border-[#20253a] bg-[#111523]"/>)}</div>; }
function Status({ value }: {value:string}) { const k = value.toLowerCase(); const colors:any={active:'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',success:'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',paused:'bg-amber-400/10 text-amber-200 border-amber-400/20',draft:'bg-slate-400/10 text-slate-400 border-slate-400/20',failed:'bg-rose-400/10 text-rose-300 border-rose-400/20',skipped:'bg-slate-400/10 text-slate-400 border-slate-400/20'}; return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-bold capitalize tracking-wide ${colors[k]||colors.draft}`}><span className="h-1 w-1 rounded-full bg-current"/>{value}</span>; }
function fmtDate(value:string) { const d=new Date(value); return Number.isNaN(+d)?'—':d.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}); }
function Empty({ icon:Icon=WorkflowIcon,title,body,action }: {icon?:any;title:string;body:string;action?:ReactNode}) {return <div className="panel flex min-h-[255px] flex-col items-center justify-center rounded-2xl px-6 py-12 text-center"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#30364b] bg-[#151a29] text-blue-300"><Icon size={19}/></div><h3 className="text-[14px] font-bold text-slate-200">{title}</h3><p className="mt-2 max-w-sm text-[11px] leading-5 text-slate-500">{body}</p>{action&&<div className="mt-5">{action}</div>}</div>}

function Dashboard() {
  const q=useGetFlowmindDashboard(); const data=q.data;
  return <><PageHeading eyebrow="MONDAY, WORKSPACE OVERVIEW" title="Good morning, Alex" subtitle="A clear view of what your automations are doing today." right={<Link href="/create" className="no-underline"><Button><Plus size={14}/>New workflow</Button></Link>}/>
    {q.isLoading?<Skeleton rows={3}/>:q.isError?<ErrorState retry={()=>q.refetch()}/>:<div className="space-y-6 fade-up">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {label:'Active workflows',value:data?.activeWorkflows??0,sub:'Ready to run',icon:WorkflowIcon,tint:'text-blue-300',bar:'bg-blue-400'},
          {label:'Executions today',value:data?.executionsToday??0,sub:'Across all workflows',icon:Activity,tint:'text-violet-300',bar:'bg-violet-400'},
          {label:'Success rate',value:`${data?.successRate??0}%`,sub:'Last 30 days',icon:Check,tint:'text-emerald-300',bar:'bg-emerald-400'},
          {label:'Failed runs',value:data?.failedRuns??0,sub:'Need your attention',icon:AlertTriangle,tint:'text-amber-300',bar:'bg-amber-300'},
        ].map((m,i)=><div key={m.label} className="panel relative overflow-hidden rounded-xl p-4" style={{animationDelay:`${i*65}ms`}}><div className="flex items-start justify-between"><p className="text-[10px] font-semibold text-slate-500">{m.label}</p><m.icon size={15} className={m.tint}/></div><p className="mt-4 text-[27px] font-bold tracking-[-.05em] text-slate-100">{m.value}</p><p className="mt-1 text-[10px] text-slate-600">{m.sub}</p><div className={`absolute bottom-0 left-0 h-[2px] w-1/4 ${m.bar} opacity-50`}/></div>)}
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <div className="panel rounded-xl">
          <div className="flex items-center justify-between border-b border-[#24293b] px-5 py-4"><div><h2 className="text-[12px] font-bold text-slate-200">Recent workflows</h2><p className="mt-1 text-[10px] text-slate-600">Your team’s most recently updated flows</p></div><Link href="/workflows" className="flex items-center gap-1 text-[10px] font-semibold text-blue-300 no-underline hover:text-blue-200">All workflows<ArrowRight size={12}/></Link></div>
          {(data?.recentWorkflows??[]).length===0?<div className="p-4"><Empty title="No workflows yet" body="Describe a repetitive task and FlowMind will shape it into an editable flow." action={<Link href="/create"><Button><Sparkles size={13}/>Generate a workflow</Button></Link>}/></div>:<div className="divide-y divide-[#20253a]">{data?.recentWorkflows.map(w=><WorkflowRow key={w.id} workflow={w}/>)}</div>}
        </div>
        <div className="panel rounded-xl">
          <div className="flex items-center justify-between border-b border-[#24293b] px-5 py-4"><div><h2 className="text-[12px] font-bold text-slate-200">Latest executions</h2><p className="mt-1 text-[10px] text-slate-600">Simulated run history</p></div><Link href="/executions" className="flex items-center gap-1 text-[10px] font-semibold text-blue-300 no-underline">View history<ArrowRight size={12}/></Link></div>
          <div className="divide-y divide-[#20253a]">{(data?.recentExecutions??[]).length?data?.recentExecutions.slice(0,5).map(e=><ExecutionRow key={e.id} item={e}/>):<div className="p-4"><Empty icon={FileClock} title="No runs recorded" body="Simulate a workflow to inspect its execution path and sample output."/></div>}</div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-[1fr_1.35fr]">
        <div className="relative overflow-hidden rounded-xl border border-blue-400/15 bg-[linear-gradient(120deg,rgba(43,85,158,.14),rgba(93,69,157,.08))] p-5"><div className="absolute -right-6 -top-10 h-40 w-40 rounded-full border border-blue-300/10"/><div className="relative flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-blue-300"><Sparkles size={13}/> Start in plain language</div><p className="relative mt-3 max-w-sm text-[16px] font-semibold leading-6 tracking-[-.02em] text-slate-200">“When a new lead arrives, qualify it and alert the right person.”</p><Link href="/create" className="relative mt-4 inline-flex items-center gap-2 text-[10px] font-bold text-blue-300 no-underline">Build your first flow<ArrowRight size={12}/></Link></div>
        <div className="panel flex items-center justify-between gap-4 rounded-xl p-5"><div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-slate-400"><LockKeyhole size={13}/>Safe by design</div><p className="mt-3 max-w-sm text-[11px] leading-5 text-slate-500">Every run is a simulation using sample data. Integrations are labeled by their real connection state before you configure anything.</p></div><div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/[.06] text-emerald-300 sm:flex"><ShieldCheck size={20}/></div></div>
      </section>
    </div>}</>;
}
function WorkflowRow({workflow:w}: {workflow:Workflow}) { return <div className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[.015]"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#30364b] bg-[#141a29] text-blue-300"><Zap size={14}/></div><div className="min-w-0 flex-1"><Link href={`/builder/${w.id}`} className="block truncate text-[11px] font-bold text-slate-200 no-underline hover:text-blue-300">{w.name}</Link><p className="mt-1 truncate text-[10px] text-slate-600">{w.triggerType} · {w.nodes?.length||0} steps</p></div><Status value={w.status}/><Link href={`/builder/${w.id}`} aria-label={`Open ${w.name}`} className="rounded p-1.5 text-slate-600 hover:text-slate-300"><ArrowUpRight size={14}/></Link></div>; }
function ExecutionRow({item:e}: {item:Execution}) {return <Link href={`/executions/${e.id}`} className="flex items-center gap-3 px-5 py-3.5 no-underline transition-colors hover:bg-white/[.015]"><span className={`h-2 w-2 rounded-full ${e.status==='success'?'bg-emerald-400':'bg-rose-400'}`}/><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold text-slate-300">{e.workflowName}</span><span className="mt-1 block text-[9px] text-slate-600">{fmtDate(e.startedAt)} · {e.nodesExecuted}/{e.totalNodes} steps</span></span><Status value={e.status}/><span className="font-mono text-[9px] text-slate-600">{e.durationMs}ms</span></Link>}

function Workflows() {
 const q=useListFlowmindWorkflows(); const qc2=useQueryClient(); const del=useDeleteFlowmindWorkflow(); const update=useUpdateFlowmindWorkflow(); const duplicate=useCreateFlowmindWorkflow();
 const [search,setSearch]=useState(''); const [filter,setFilter]=useState('all');
 const list=q.data??[]; const filtered=useMemo(()=>list.filter(w=>(filter==='all'||w.status===filter)&&`${w.name} ${w.description} ${w.triggerType}`.toLowerCase().includes(search.toLowerCase())),[list,filter,search]);
 const refresh=()=>{qc2.invalidateQueries({queryKey:getListFlowmindWorkflowsQueryKey()});qc2.invalidateQueries({queryKey:getGetFlowmindDashboardQueryKey()})};
 const duplicateWorkflow=(w:Workflow)=>{const ids=new Map(w.nodes.map(n=>[n.id,`node-${crypto.randomUUID()}`]));duplicate.mutate({data:{name:`${w.name} copy`,description:w.description,status:'draft',triggerType:w.triggerType,nodes:w.nodes.map(n=>({...n,id:ids.get(n.id)!,position:{x:n.position.x+48,y:n.position.y+48}})),edges:w.edges.map(e=>({...e,id:`edge-${crypto.randomUUID()}`,source:ids.get(e.source)!,target:ids.get(e.target)!}))}},{onSuccess:refresh})};
 return <><PageHeading eyebrow="AUTOMATION LIBRARY" title="Workflows" subtitle="Design, review, and control your team's automations." right={<Link href="/create"><Button><Plus size={14}/>Create workflow</Button></Link>}/>
  <div className="panel mb-4 flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative min-w-0 flex-1 sm:max-w-sm"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"/><input aria-label="Search workflows" data-testid="input-search-workflows" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search workflows..." className="h-9 w-full rounded-lg border border-[#272d41] bg-[#0d111d] pl-9 pr-3 text-[11px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-blue-400/50"/></div><div className="flex items-center gap-2"><SlidersHorizontal size={13} className="text-slate-600"/><select aria-label="Filter status" value={filter} onChange={e=>setFilter(e.target.value)} className="h-9 rounded-lg border border-[#272d41] bg-[#0d111d] px-3 text-[10px] text-slate-300 outline-none"><option value="all">All statuses</option><option value="active">Active</option><option value="paused">Paused</option><option value="draft">Draft</option></select><span className="font-mono text-[9px] text-slate-600">{filtered.length} flows</span></div></div>
  {q.isLoading?<Skeleton/>:q.isError?<ErrorState retry={()=>q.refetch()}/>:filtered.length===0?<Empty title={search||filter!=='all'?'No matching workflows':'Your workspace is a blank canvas'} body={search||filter!=='all'?'Adjust the search or status filter to find a workflow.':'Create one from a plain-language description, or start with a template.'} action={!(search||filter!=='all')?<Link href="/create"><Button><Sparkles size={13}/>Create a workflow</Button></Link>:undefined}/>:<div className="panel overflow-hidden rounded-xl"><div className="hidden grid-cols-[minmax(200px,1.6fr)_1fr_.7fr_.7fr_90px] gap-3 border-b border-[#24293b] bg-[#111522] px-5 py-3 font-mono text-[9px] uppercase tracking-[.12em] text-slate-600 md:grid"><span>Workflow</span><span>Trigger</span><span>Steps</span><span>Updated</span><span>Status</span></div>{filtered.map(w=><div key={w.id} className="group grid gap-3 border-b border-[#20253a] px-4 py-4 last:border-0 md:grid-cols-[minmax(200px,1.6fr)_1fr_.7fr_.7fr_90px] md:items-center md:px-5">
    <div className="flex items-center gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#30364b] bg-[#151a29] text-blue-300"><Zap size={14}/></div><div className="min-w-0"><Link href={`/builder/${w.id}`} className="block truncate text-[11px] font-bold text-slate-200 no-underline hover:text-blue-300">{w.name}</Link><p className="mt-1 truncate text-[10px] text-slate-600">{w.description||'No description added'}</p></div></div>
    <span className="text-[10px] text-slate-400"><span className="text-slate-600 md:hidden">Trigger · </span>{w.triggerType}</span><span className="text-[10px] text-slate-400"><span className="text-slate-600 md:hidden">Steps · </span>{w.nodes?.length||0} nodes</span><span className="text-[10px] text-slate-500"><span className="text-slate-600 md:hidden">Updated · </span>{fmtDate(w.updatedAt)}</span>
     <div className="flex items-center justify-between gap-2"><button onClick={()=>update.mutate({id:w.id,data:{status:w.status==='active'?'paused':'active'}},{onSuccess:refresh})} aria-label={`${w.status==='active'?'Pause':'Activate'} ${w.name}`} className="text-slate-500 hover:text-blue-300">{w.status==='active'?<Pause size={14}/>:<Play size={14}/>}</button><Status value={w.status}/><button onClick={()=>duplicateWorkflow(w)} aria-label={`Duplicate ${w.name}`} title="Duplicate as a draft" className="text-slate-600 transition hover:text-blue-300 sm:opacity-0 sm:group-hover:opacity-100"><Copy size={13}/></button><button aria-label={`Delete ${w.name}`} onClick={()=>{if(confirm(`Delete “${w.name}”? This cannot be undone.`))del.mutate({id:w.id},{onSuccess:refresh})}} className="text-slate-700 opacity-100 transition hover:text-rose-300 sm:opacity-0 sm:group-hover:opacity-100"><Trash2 size={13}/></button></div>
   </div>)}</div>}
 </>;
}

function CreateWorkflow() {
 const [prompt,setPrompt]=useState('When a new support request arrives, summarize it, check its urgency, and notify the on-call team.');
 const [generated,setGenerated]=useState<null|{workflow:WorkflowInput;explanation:string;mode:string}>(null);
 const generate=useGenerateFlowmindWorkflow(); const create=useCreateFlowmindWorkflow(); const [,setLocation]=useLocation(); const client=useQueryClient();
 const handleGenerate=(e:FormEvent)=>{e.preventDefault(); if(prompt.trim().length<10)return; setGenerated(null);generate.mutate({data:{prompt:prompt.trim()}},{onSuccess:setGenerated});};
 const save=()=>generated&&create.mutate({data:generated.workflow},{onSuccess:w=>{client.invalidateQueries({queryKey:getListFlowmindWorkflowsQueryKey()});client.invalidateQueries({queryKey:getGetFlowmindDashboardQueryKey()});setLocation(`/builder/${w.id}`)}});
 return <><PageHeading eyebrow="PLAIN LANGUAGE → FLOW" title="What should happen?" subtitle="Describe the repetitive work. We’ll turn it into a visual workflow you can review before it runs." right={<Link href="/templates" className="text-[10px] font-semibold text-slate-500 no-underline hover:text-slate-300">Browse templates <ArrowRight size={12} className="inline"/></Link>}/>
   <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
    <div>
     <form onSubmit={handleGenerate} className="panel overflow-hidden rounded-2xl">
       <div className="border-b border-[#24293b] px-5 py-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-slate-400"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-400/10 text-violet-300"><Sparkles size={13}/></span>Describe your workflow</div></div>
       <div className="p-5"><textarea data-testid="input-workflow-prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} rows={5} placeholder="For example: When a new lead is added to our CRM, check their company size, assign an owner, and send a Slack alert..." className="w-full resize-y rounded-xl border border-[#282e42] bg-[#0c101b] p-4 text-[13px] leading-6 text-slate-200 outline-none placeholder:text-slate-700 focus:border-blue-400/50"/>
       <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><p className="max-w-md text-[10px] leading-4 text-slate-600">Be specific about the trigger, the decisions to make, and the actions that should follow.</p><Button type="submit" disabled={generate.isPending||prompt.trim().length<10}>{generate.isPending?<><LoaderCircle className="animate-spin" size={13}/>Thinking through your flow</>:<><Sparkles size={13}/>Generate workflow</>}</Button></div>
       {generate.isError&&<div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-400/[.06] p-3 text-[10px] text-rose-200"><AlertTriangle size={13} className="mt-0.5 shrink-0"/>We couldn’t generate a workflow. Your description is still here—try again in a moment.</div>}
       </div>
     </form>
     {generated&&<div className="panel mt-5 overflow-hidden rounded-2xl fade-up">
       <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#24293b] px-5 py-4"><div><div className="flex items-center gap-2 text-[12px] font-bold text-slate-200"><Check size={14} className="text-emerald-300"/>Workflow outline</div><p className="mt-1 text-[10px] text-slate-600">Review the structure before saving it to your workspace.</p></div><span className={`rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-wide ${generated.mode==='ai'?'border-violet-400/20 bg-violet-400/10 text-violet-300':'border-amber-300/20 bg-amber-300/[.07] text-amber-200'}`}>{generated.mode==='ai'?'AI generated':'Demo generation'}</span></div>
       <div className="p-5"><h2 className="text-[16px] font-bold text-slate-100">{generated.workflow.name}</h2><p className="mt-2 text-[11px] leading-5 text-slate-500">{generated.workflow.description}</p>
       <div className="my-5 flex flex-wrap items-center gap-2">{generated.workflow.nodes.map((n,i)=><div key={n.id} className="flex items-center gap-2">{i>0&&<ArrowRight size={12} className="text-slate-700"/>}<div className="rounded-lg border border-[#30364b] bg-[#121725] px-3 py-2"><div className="font-mono text-[8px] uppercase tracking-[.12em] text-blue-300">{n.type}</div><div className="mt-1 text-[10px] font-semibold text-slate-300">{n.label}</div></div></div>)}</div>
       {generated.explanation&&<div className="mb-5 rounded-lg border border-[#282e42] bg-[#101421] p-3 text-[10px] leading-5 text-slate-500"><span className="font-semibold text-slate-300">Why this structure</span><br/>{generated.explanation}</div>}
       <div className="flex flex-wrap items-center gap-2"><Button onClick={save} disabled={create.isPending}>{create.isPending?<LoaderCircle size={13} className="animate-spin"/>:<Check size={13}/>}Save and open builder</Button><Button variant="outline" onClick={()=>setGenerated(null)}>Discard draft</Button></div>
       {create.isError&&<p className="mt-3 text-[10px] text-rose-300">Could not save this workflow. Please try again.</p>}
       </div></div>}
    </div>
    <aside className="space-y-4">
      <div className="panel rounded-xl p-4"><p className="font-mono text-[9px] uppercase tracking-[.16em] text-slate-500">A useful description includes</p><div className="mt-4 space-y-4">{[{n:'01',title:'A clear starting point',body:'What event or schedule kicks this off?'},{n:'02',title:'The decision logic',body:'What should the workflow check or sort?'},{n:'03',title:'The intended outcome',body:'What should be prepared or notified?'}].map(x=><div key={x.n} className="flex gap-3"><span className="font-mono text-[9px] text-blue-400">{x.n}</span><div><p className="text-[10px] font-bold text-slate-300">{x.title}</p><p className="mt-1 text-[10px] leading-4 text-slate-600">{x.body}</p></div></div>)}</div></div>
      <div className="rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-4"><div className="flex items-center gap-2 text-[10px] font-bold text-amber-100"><LockKeyhole size={13}/>Safe to explore</div><p className="mt-2 text-[10px] leading-5 text-slate-500">Generated flows are drafts. Runs are simulated with sample data; no outside service is contacted.</p></div>
    </aside>
   </div>
 </>;
}

function Builder() {
 const [,params]=useRoute('/builder/:id'); const id=params?.id||''; const q=useGetFlowmindWorkflow(id,{query:{enabled:!!id,queryKey:getGetFlowmindWorkflowQueryKey(id)}});
 const update=useUpdateFlowmindWorkflow(); const run=useRunFlowmindWorkflow(); const client=useQueryClient(); const [selected,setSelected]=useState<string|null>(null); const [sample,setSample]=useState('{"event":"sample","priority":"high"}'); const [,setLocation]=useLocation();
 const wf=q.data; const node=wf?.nodes.find(n=>n.id===selected);
 const persist=(payload:any)=>update.mutate({id,data:payload},{onSuccess:w=>{client.setQueryData(getGetFlowmindWorkflowQueryKey(id),w);client.invalidateQueries({queryKey:getListFlowmindWorkflowsQueryKey()});client.invalidateQueries({queryKey:getGetFlowmindDashboardQueryKey()})}});
 const updateNode=(n:WorkflowNode,patch:Partial<WorkflowNode>)=>wf&&persist({nodes:wf.nodes.map(x=>x.id===n.id?{...x,...patch}:x)});
 const addNode=(type:WorkflowNode['type'])=>{if(!wf)return; const n:WorkflowNode={id:`node-${Date.now()}`,type,label:type==='action'?'New action':type==='condition'?'Condition':'AI step',actionType:type==='action'?'custom':undefined,position:{x:100,y:100+wf.nodes.length*150},config:{}};persist({nodes:[...wf.nodes,n],edges:[...wf.edges,...(wf.nodes.length?[{id:`edge-${Date.now()}`,source:wf.nodes[wf.nodes.length-1].id,target:n.id,label:null}]:[])]});setSelected(n.id)};
  const duplicateNode=()=>{if(!wf||!node||node.type==='trigger')return;const copy:WorkflowNode={...node,id:`node-${Date.now()}`,label:`${node.label} copy`,position:{x:node.position.x+260,y:node.position.y+80},config:{...node.config}};persist({nodes:[...wf.nodes,copy],edges:[...wf.edges,{id:`edge-${Date.now()}-copy`,source:node.id,target:copy.id,label:null}]});setSelected(copy.id)};
 const simulate=()=>{let parsed={};try{parsed=JSON.parse(sample)}catch{return}run.mutate({id,data:{sampleData:parsed}},{onSuccess:e=>{client.invalidateQueries({queryKey:getListFlowmindExecutionsQueryKey()});client.invalidateQueries({queryKey:getGetFlowmindDashboardQueryKey()});setLocation(`/executions/${e.id}`)}})};
 if(q.isLoading)return <Skeleton rows={5}/>; if(q.isError||!wf)return <ErrorState retry={()=>q.refetch()} label="This workflow couldn’t be opened."/>
 return <div className="fade-up">
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Link href="/workflows" className="rounded-lg border border-[#30364b] bg-[#111523] p-2 text-slate-400 hover:text-slate-100"><ArrowLeft size={14}/></Link><div><div className="flex items-center gap-2"><input aria-label="Workflow name" value={wf.name} onChange={e=>client.setQueryData(getGetFlowmindWorkflowQueryKey(id),{...wf,name:e.target.value})} onBlur={e=>persist({name:e.target.value})} className="max-w-[min(65vw,500px)] bg-transparent text-[16px] font-bold tracking-[-.03em] text-slate-100 outline-none"/><Status value={wf.status}/></div><p className="mt-1 text-[10px] text-slate-600">{wf.triggerType} · Updated {fmtDate(wf.updatedAt)}</p></div></div>
   <div className="flex items-center gap-2"><Button variant="outline" onClick={simulate} disabled={run.isPending}>{run.isPending?<LoaderCircle size={13} className="animate-spin"/>:<Play size={13}/>}Simulate</Button><Button onClick={()=>persist({status:wf.status==='active'?'paused':'active'})}>{wf.status==='active'?<Pause size={13}/>:<Play size={13} />}{wf.status==='active'?'Pause flow':'Activate flow'}</Button></div>
  </div>
  <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_310px]">
    <section className="panel overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-[#252a3d] px-4 py-3"><div><p className="text-[11px] font-bold text-slate-300">Workflow canvas</p><p className="mt-1 text-[9px] text-slate-600">Select a step to inspect its configuration</p></div><div className="flex items-center gap-2"><span className="font-mono text-[9px] text-slate-600">{wf.nodes.length} nodes · {wf.edges.length} links</span><button aria-label="Fit workflow" className="rounded-md border border-[#30364b] p-1.5 text-slate-500 hover:text-slate-200"><Eye size={13}/></button></div></div>
       <WorkflowCanvas
         key={wf.id}
         workflow={wf}
         selectedNodeId={selected}
         onSelectNode={setSelected}
         onGraphPersist={(nodes,edges)=>persist({nodes,edges})}
       />
       <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#252a3d] px-4 py-3">
         <div className="flex flex-wrap items-center gap-2">
           <span className="mr-1 flex items-center gap-2 text-[9px] text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-amber-300"/>{wf.nodes.length} nodes · {wf.edges.length} links · Auto-saved</span>
           {(['action','condition','ai'] as const).map(t=><button key={t} onClick={()=>addNode(t)} className="flex items-center gap-1 rounded-md border border-dashed border-[#3a4156] px-2.5 py-1.5 text-[9px] font-semibold capitalize text-slate-500 hover:border-blue-400/40 hover:text-blue-300"><Plus size={11}/>{t}</button>)}
         </div>
         <div className="flex items-center gap-4">
           <button onClick={duplicateNode} disabled={!node||node.type==='trigger'} className="flex items-center gap-1.5 text-[9px] text-slate-600 hover:text-blue-300 disabled:opacity-30"><Copy size={12}/>Duplicate selected</button>
           <button onClick={()=>{if(confirm('Remove the selected step?')){if(selected){persist({nodes:wf.nodes.filter(n=>n.id!==selected),edges:wf.edges.filter(e=>e.source!==selected&&e.target!==selected)});setSelected(null)}}}} disabled={!selected} className="flex items-center gap-1.5 text-[9px] text-slate-600 hover:text-rose-300 disabled:opacity-30"><Trash2 size={12}/>Delete selected</button>
         </div>
       </div>
    </section>
    <aside className="space-y-4">
      {node?<div className="panel rounded-xl p-4"><div className="mb-4 flex items-center justify-between"><div><p className="font-mono text-[9px] uppercase tracking-[.15em] text-blue-300">Node settings</p><p className="mt-1 text-[10px] text-slate-600">Edit the selected step</p></div><button aria-label="Close node settings" onClick={()=>setSelected(null)} className="text-slate-600 hover:text-slate-200"><X size={14}/></button></div>
        <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Step label</label><input value={node.label} onChange={e=>updateNode(node,{label:e.target.value})} className="mb-4 h-9 w-full rounded-lg border border-[#2b3145] bg-[#0c101b] px-3 text-[10px] text-slate-200 outline-none focus:border-blue-400/50"/>
        {node.type==='action'&&<><label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Action type</label><input value={node.actionType||''} onChange={e=>updateNode(node,{actionType:e.target.value})} placeholder="e.g. notify, create_record" className="mb-4 h-9 w-full rounded-lg border border-[#2b3145] bg-[#0c101b] px-3 text-[10px] text-slate-200 outline-none focus:border-blue-400/50"/></>}
        <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Configuration (JSON)</label><textarea key={node.id} defaultValue={JSON.stringify(node.config,null,2)} onBlur={e=>{try{updateNode(node,{config:JSON.parse(e.target.value)})}catch{}}} rows={6} className="w-full rounded-lg border border-[#2b3145] bg-[#0c101b] p-3 font-mono text-[9px] leading-5 text-slate-400 outline-none focus:border-blue-400/50"/>
        <p className="mt-3 rounded-lg border border-amber-300/10 bg-amber-300/[.035] p-2.5 text-[9px] leading-4 text-amber-100/60">This step is configured for review only. Integrations are not connected.</p></div>:<div className="panel rounded-xl p-4"><p className="font-mono text-[9px] uppercase tracking-[.15em] text-slate-500">Flow details</p><label className="mb-1.5 mt-4 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Description</label><textarea value={wf.description} onChange={e=>client.setQueryData(getGetFlowmindWorkflowQueryKey(id),{...wf,description:e.target.value})} onBlur={e=>persist({description:e.target.value})} rows={4} className="w-full rounded-lg border border-[#2b3145] bg-[#0c101b] p-3 text-[10px] leading-5 text-slate-300 outline-none focus:border-blue-400/50"/><div className="mt-4 flex items-center gap-2 text-[9px] text-slate-600"><Clock3 size={12}/>Created {fmtDate(wf.createdAt)}</div></div>}
      <div className="panel rounded-xl p-4"><div className="flex items-center gap-2 text-[10px] font-bold text-slate-300"><Terminal size={13} className="text-violet-300"/>Sample input</div><p className="mt-1 text-[9px] text-slate-600">Used only for this simulation</p><textarea value={sample} onChange={e=>setSample(e.target.value)} rows={4} className="mt-3 w-full rounded-lg border border-[#2b3145] bg-[#0c101b] p-3 font-mono text-[9px] leading-5 text-slate-400 outline-none focus:border-blue-400/50"/><button onClick={()=>setSample('{"event":"sample","priority":"high"}')} className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-600 hover:text-slate-300"><Copy size={10}/>Reset sample</button></div>
      <div className="rounded-xl border border-blue-400/15 bg-blue-400/[.035] p-4"><p className="flex items-center gap-2 text-[10px] font-bold text-blue-200"><ShieldCheck size={13}/>Simulation only</p><p className="mt-2 text-[9px] leading-4 text-slate-500">No external integrations are invoked. Simulation outcomes are stored in execution history.</p></div>
    </aside>
  </div>
 </div>;
}

function Templates() {
 const q=useListFlowmindTemplates();const useTemplate=useUseFlowmindTemplate();const client=useQueryClient();const [,setLocation]=useLocation();const [category,setCategory]=useState('All templates');
 const templates=q.data??[];const categories=['All templates',...Array.from(new Set(templates.map(x=>x.category)))];const filtered=category==='All templates'?templates:templates.filter(x=>x.category===category);
 return <><PageHeading eyebrow="START WITH A PATTERN" title="Template library" subtitle="A solid starting point for common team routines. Every template opens as an editable draft."/>
 <div className="mb-5 flex flex-wrap gap-2">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={`rounded-lg border px-3 py-2 text-[10px] font-semibold transition ${category===c?'border-blue-400/30 bg-blue-400/10 text-blue-200':'border-[#292f42] bg-[#101421] text-slate-500 hover:text-slate-300'}`}>{c}</button>)}</div>
 {q.isLoading?<Skeleton rows={4}/>:q.isError?<ErrorState retry={()=>q.refetch()}/>:filtered.length===0?<Empty icon={Blocks} title="No templates available" body="There are no templates in this category yet. Try another category or describe a workflow from scratch." action={<Link href="/create"><Button><Sparkles size={13}/>Describe a workflow</Button></Link>}/>:<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filtered.map((t,i)=><TemplateCard key={t.id} template={t} index={i} busy={useTemplate.isPending} onUse={()=>useTemplate.mutate({templateId:t.id},{onSuccess:w=>{client.invalidateQueries({queryKey:getListFlowmindWorkflowsQueryKey()});client.invalidateQueries({queryKey:getGetFlowmindDashboardQueryKey()});client.setQueryData(getGetFlowmindWorkflowQueryKey(w.id),w);setLocation(`/builder/${w.id}`)}})}/>)}</div>}
 {useTemplate.isError&&<p className="mt-4 text-[10px] text-rose-300">Couldn’t create a workflow from this template. Try again.</p>}
 </>;
}
function TemplateCard({template:t,index,busy,onUse}:{template:WorkflowTemplate;index:number;busy:boolean;onUse:()=>void}) {
 const accents=['text-blue-300 bg-blue-400/10','text-violet-300 bg-violet-400/10','text-emerald-300 bg-emerald-400/10','text-amber-200 bg-amber-300/10'];const accent=accents[index%accents.length];
 return <article className="panel group flex min-h-[230px] flex-col rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:border-[#3c4663]"><div className="flex items-start justify-between"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}><Blocks size={16}/></span><span className="rounded-md border border-[#2a3042] px-2 py-1 font-mono text-[8px] uppercase tracking-wide text-slate-500">{t.category}</span></div><h2 className="mt-5 text-[13px] font-bold text-slate-200">{t.name}</h2><p className="mt-2 flex-1 text-[10px] leading-5 text-slate-500">{t.description}</p><div className="mt-4 flex items-center justify-between border-t border-[#252a3c] pt-3"><div className="flex gap-3 font-mono text-[9px] text-slate-600"><span>{t.triggerType}</span><span>·</span><span>{t.actionCount} actions</span></div><Button variant="outline" onClick={onUse} disabled={busy}>Use template<ArrowRight size={12}/></Button></div></article>;
}

function Executions() {
 const q=useListFlowmindExecutions();const [filter,setFilter]=useState('all');const [search,setSearch]=useState('');
 const items=q.data??[];const filtered=items.filter(e=>(filter==='all'||e.status===filter)&&e.workflowName.toLowerCase().includes(search.toLowerCase()));
 return <><PageHeading eyebrow="RUN OBSERVABILITY" title="Execution history" subtitle="Inspect simulated runs, sample inputs, and step-by-step outcomes." right={<div className="flex items-center gap-2 rounded-lg border border-amber-300/15 bg-amber-300/[.04] px-3 py-2 text-[9px] font-semibold text-amber-100/70"><ShieldCheck size={13} className="text-amber-200"/>All runs are simulations</div>}/>
 <div className="panel mb-4 flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative min-w-0 flex-1 sm:max-w-sm"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search workflow runs..." aria-label="Search execution history" className="h-9 w-full rounded-lg border border-[#272d41] bg-[#0d111d] pl-9 pr-3 text-[11px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-blue-400/50"/></div><div className="flex items-center gap-2"><Filter size={13} className="text-slate-600"/><select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter execution status" className="h-9 rounded-lg border border-[#272d41] bg-[#0d111d] px-3 text-[10px] text-slate-300 outline-none"><option value="all">All outcomes</option><option value="success">Successful</option><option value="failed">Failed</option></select><span className="font-mono text-[9px] text-slate-600">{filtered.length} runs</span></div></div>
 {q.isLoading?<Skeleton rows={6}/>:q.isError?<ErrorState retry={()=>q.refetch()}/>:filtered.length===0?<Empty icon={FileClock} title={search?'No runs match your search':'No execution history yet'} body={search?'Try another workflow name.':'Simulate a workflow from its builder to create a safe, inspectable run.'} action={!search?<Link href="/workflows"><Button variant="outline">Open workflows<ArrowRight size={13}/></Button></Link>:undefined}/>:<div className="panel overflow-hidden rounded-xl"><div className="hidden grid-cols-[1.35fr_1fr_.7fr_.65fr_.6fr_32px] gap-4 border-b border-[#24293b] bg-[#111522] px-5 py-3 font-mono text-[9px] uppercase tracking-[.12em] text-slate-600 md:grid"><span>Workflow</span><span>Started</span><span>Duration</span><span>Steps</span><span>Outcome</span><span/></div>{filtered.map(e=><Link key={e.id} href={`/executions/${e.id}`} className="grid gap-2 border-b border-[#20253a] px-4 py-4 no-underline last:border-0 hover:bg-white/[.015] md:grid-cols-[1.35fr_1fr_.7fr_.65fr_.6fr_32px] md:items-center md:gap-4 md:px-5">
   <div className="flex items-center gap-3"><div className={`flex h-8 w-8 items-center justify-center rounded-lg ${e.status==='success'?'bg-emerald-400/10 text-emerald-300':'bg-rose-400/10 text-rose-300'}`}>{e.status==='success'?<Check size={14}/>:<AlertTriangle size={14}/>}</div><div><p className="text-[11px] font-bold text-slate-200">{e.workflowName}</p><p className="mt-1 font-mono text-[9px] text-slate-600">RUN-{e.id.slice(-6).toUpperCase()} · SIMULATED</p></div></div>
   <span className="text-[10px] text-slate-400"><span className="mr-2 text-slate-600 md:hidden">Started</span>{fmtDate(e.startedAt)}</span><span className="font-mono text-[10px] text-slate-400"><span className="mr-2 text-slate-600 md:hidden">Duration</span>{e.durationMs} ms</span><span className="font-mono text-[10px] text-slate-400"><span className="mr-2 text-slate-600 md:hidden">Steps</span>{e.nodesExecuted}/{e.totalNodes}</span><Status value={e.status}/><ArrowUpRight size={14} className="hidden text-slate-600 md:block"/></Link>)}</div>}
 </>;
}
function ExecutionDetail() {
 const [,params]=useRoute('/executions/:id');const id=params?.id||'';const q=useGetFlowmindExecution(id,{query:{enabled:!!id,queryKey:getGetFlowmindExecutionQueryKey(id)}});
 if(q.isLoading)return <Skeleton rows={4}/>;if(q.isError||!q.data)return <ErrorState retry={()=>q.refetch()} label="This execution couldn’t be found."/>;const e=q.data;
 return <><PageHeading eyebrow={`RUN-${e.id.slice(-6).toUpperCase()} · SIMULATED`} title={e.workflowName} subtitle={`Started ${fmtDate(e.startedAt)} · Duration ${e.durationMs} ms`} right={<><Link href={`/builder/${e.workflowId}`}><Button variant="outline"><WorkflowIcon size={13}/>Open workflow</Button></Link><Link href="/executions" className="rounded-lg border border-[#30364b] bg-[#121624] p-2.5 text-slate-400 hover:text-slate-100"><ArrowLeft size={14}/></Link></>}/>
 <div className="mb-5 grid gap-3 sm:grid-cols-3"><div className="panel rounded-xl p-4"><p className="text-[9px] uppercase tracking-[.14em] text-slate-600">Outcome</p><div className="mt-3"><Status value={e.status}/></div></div><div className="panel rounded-xl p-4"><p className="text-[9px] uppercase tracking-[.14em] text-slate-600">Steps completed</p><p className="mt-2 text-[20px] font-bold text-slate-200">{e.nodesExecuted}<span className="ml-1 text-[12px] font-medium text-slate-600">/ {e.totalNodes}</span></p></div><div className="panel flex items-center justify-between rounded-xl p-4"><div><p className="text-[9px] uppercase tracking-[.14em] text-slate-600">Execution mode</p><p className="mt-2 text-[11px] font-bold text-amber-100">Simulation</p></div><ShieldCheck size={18} className="text-amber-200"/></div></div>
 <div className="grid gap-5 xl:grid-cols-[1fr_340px]"><section className="panel rounded-xl"><div className="border-b border-[#252a3d] px-5 py-4"><h2 className="text-[12px] font-bold text-slate-200">Step timeline</h2><p className="mt-1 text-[10px] text-slate-600">Recorded output for each workflow node</p></div><div className="p-5">{e.nodeLogs.length?e.nodeLogs.map((log,i)=><div key={`${log.nodeId}-${i}`} className="relative flex gap-4 pb-6 last:pb-0"><div className="flex flex-col items-center"><span className={`z-10 flex h-7 w-7 items-center justify-center rounded-lg border ${log.status==='success'?'border-emerald-400/20 bg-emerald-400/10 text-emerald-300':log.status==='failed'?'border-rose-400/20 bg-rose-400/10 text-rose-300':'border-[#30364b] bg-[#151a29] text-slate-500'}`}>{log.status==='success'?<Check size={13}/>:log.status==='failed'?<X size={13}/>:<ArrowDown size={13}/>}</span>{i<e.nodeLogs.length-1&&<span className="absolute top-7 bottom-0 w-px bg-[#30364b]"/>}</div><div className="min-w-0 flex-1 rounded-xl border border-[#282e42] bg-[#101421] p-3.5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[11px] font-bold text-slate-200">{log.label}</p><p className="mt-1 font-mono text-[8px] text-slate-600">{log.nodeId}</p></div><div className="flex items-center gap-2"><Status value={log.status}/><span className="font-mono text-[9px] text-slate-600">{log.durationMs}ms</span></div></div><p className="mt-3 text-[10px] leading-5 text-slate-500">{log.detail}</p></div></div>):<Empty icon={Activity} title="No step logs" body="This execution did not include node-level details."/>}</div></section>
 <aside className="space-y-4"><div className="panel rounded-xl"><div className="border-b border-[#252a3d] px-4 py-3"><h2 className="text-[11px] font-bold text-slate-200">Sample input</h2><p className="mt-1 text-[9px] text-slate-600">Values used in this simulation</p></div><pre className="overflow-auto p-4 font-mono text-[9px] leading-5 text-blue-200/70">{JSON.stringify(e.sampleData,null,2)}</pre></div><div className="rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-4"><p className="flex items-center gap-2 text-[10px] font-bold text-amber-100"><LockKeyhole size={13}/>Nothing left this workspace</p><p className="mt-2 text-[9px] leading-4 text-slate-500">This record represents a simulated outcome. No email, message, or external system was affected.</p></div><div className="panel rounded-xl p-4"><p className="text-[9px] uppercase tracking-[.15em] text-slate-600">Run metadata</p><div className="mt-3 space-y-2 text-[9px]"><div className="flex justify-between"><span className="text-slate-600">Execution ID</span><span className="font-mono text-slate-400">{e.id}</span></div><div className="flex justify-between"><span className="text-slate-600">Workflow ID</span><span className="font-mono text-slate-400">{e.workflowId}</span></div><div className="flex justify-between"><span className="text-slate-600">Simulation flag</span><span className="text-amber-200">{e.simulated?'true':'false'}</span></div></div></div></aside></div>
 </>;
}

const integrations = [
 {name:'Slack',kind:'Team messaging',icon:'S',style:'text-fuchsia-200 bg-fuchsia-400/10',description:'Prepare channel notifications and handoff messages.'},
 {name:'Google Sheets',kind:'Data & records',icon:'G',style:'text-emerald-200 bg-emerald-400/10',description:'Read or prepare rows for spreadsheet-based workflows.'},
 {name:'HubSpot',kind:'CRM',icon:'H',style:'text-orange-200 bg-orange-400/10',description:'Model lead and contact updates in the workflow builder.'},
 {name:'Gmail',kind:'Email',icon:'M',style:'text-rose-200 bg-rose-400/10',description:'Draft email steps for later review.'},
 {name:'HTTP request',kind:'Developer tools',icon:'<>',style:'text-blue-200 bg-blue-400/10',description:'Represent outbound requests in a simulated flow.'},
 {name:'Notion',kind:'Knowledge',icon:'N',style:'text-slate-200 bg-slate-400/10',description:'Prepare a page or database action for review.'},
];
function Integrations() {
 const [filter,setFilter]=useState('all');
 return <><PageHeading eyebrow="CONNECTIONS & CAPABILITIES" title="Integrations" subtitle="Know exactly what’s connected before you build. No integration credentials or live connections are available in this workspace." right={<div className="flex items-center gap-2 rounded-lg border border-amber-300/15 bg-amber-300/[.04] px-3 py-2 text-[9px] font-semibold text-amber-100/75"><LockKeyhole size={13}/>No live integrations connected</div>}/>
 <div className="mb-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]"><div className="rounded-xl border border-amber-300/15 bg-[linear-gradient(120deg,rgba(198,145,57,.07),rgba(28,33,49,.55))] p-5"><div className="flex items-center gap-2 text-[11px] font-bold text-amber-100"><AlertTriangle size={14}/>Simulated capabilities only</div><p className="mt-2 max-w-xl text-[10px] leading-5 text-slate-400">These integration cards describe actions your workflows can model. They are not connected accounts. Runs will never send messages, update records, or call external services.</p></div><div className="panel flex items-center gap-4 rounded-xl p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-400/10 text-blue-200"><Globe2 size={18}/></div><div><p className="text-[11px] font-bold text-slate-200">Connection status</p><p className="mt-1 text-[10px] text-slate-500"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-slate-600"/>0 connected · 6 available as simulated steps</p></div></div></div>
 <div className="mb-4 flex gap-2">{[['all','All'],['Team messaging','Messaging'],['Data & records','Data'],['CRM','CRM'],['Email','Email'],['Developer tools','Developer'],['Knowledge','Knowledge']].map(([k,l])=><button key={k} onClick={()=>setFilter(k)} className={`rounded-lg border px-3 py-2 text-[9px] font-semibold ${filter===k?'border-blue-400/30 bg-blue-400/10 text-blue-200':'border-[#292f42] text-slate-500 hover:text-slate-300'}`}>{l}</button>)}</div>
 <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{integrations.filter(i=>filter==='all'||filter===i.kind).map(i=><article key={i.name} className="panel rounded-xl p-4"><div className="flex items-start gap-3"><div className={`flex h-9 w-9 items-center justify-center rounded-lg text-[12px] font-extrabold ${i.style}`}>{i.icon}</div><div className="min-w-0 flex-1"><p className="text-[12px] font-bold text-slate-200">{i.name}</p><p className="mt-1 text-[9px] text-slate-600">{i.kind}</p></div><span className="rounded-full border border-[#33394c] px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-slate-500">Not connected</span></div><p className="mt-4 min-h-9 text-[10px] leading-5 text-slate-500">{i.description}</p><div className="mt-4 flex items-center justify-between border-t border-[#252a3c] pt-3"><span className="flex items-center gap-1.5 text-[9px] text-amber-200/70"><ShieldCheck size={11}/>Simulation only</span><span className="text-[9px] text-slate-600">No auth configured</span></div></article>)}</div>
 </>;
}
function Settings() {
 const [timezone,setTimezone]=useState(localStorage.getItem('flowmind-timezone')||'America/Los_Angeles');
 const [email,setEmail]=useState(localStorage.getItem('flowmind-email')==='true');
 const [saved,setSaved]=useState(false);
 const save=()=>{localStorage.setItem('flowmind-timezone',timezone);localStorage.setItem('flowmind-email',String(email));setSaved(true);window.setTimeout(()=>setSaved(false),1800)};
 return <><PageHeading eyebrow="WORKSPACE PREFERENCES" title="Settings" subtitle="Manage workspace defaults and how FlowMind reports activity."/>
 <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"><div className="space-y-4">
  <section className="panel rounded-xl"><div className="border-b border-[#252a3d] px-5 py-4"><h2 className="text-[12px] font-bold text-slate-200">Workspace</h2><p className="mt-1 text-[10px] text-slate-600">Defaults applied to your team</p></div><div className="space-y-4 p-5"><div className="grid gap-1.5"><label className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Workspace name</label><input defaultValue="Northstar Studio" className="h-10 max-w-md rounded-lg border border-[#2b3145] bg-[#0c101b] px-3 text-[11px] text-slate-200 outline-none focus:border-blue-400/50"/></div><div className="grid gap-1.5"><label className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Default timezone</label><select value={timezone} onChange={e=>setTimezone(e.target.value)} className="h-10 max-w-md rounded-lg border border-[#2b3145] bg-[#0c101b] px-3 text-[11px] text-slate-200 outline-none"><option value="America/Los_Angeles">Pacific Time (UTC−08:00)</option><option value="America/New_York">Eastern Time (UTC−05:00)</option><option value="Europe/London">London (UTC±00:00)</option><option value="Europe/Paris">Central European Time (UTC+01:00)</option><option value="Asia/Tokyo">Japan Standard Time (UTC+09:00)</option></select></div></div></section>
  <section className="panel rounded-xl"><div className="border-b border-[#252a3d] px-5 py-4"><h2 className="text-[12px] font-bold text-slate-200">Notifications</h2><p className="mt-1 text-[10px] text-slate-600">Local preference for workspace reporting</p></div><label className="flex cursor-pointer items-center justify-between gap-4 p-5"><div><p className="text-[10px] font-bold text-slate-300">Execution summaries</p><p className="mt-1 text-[9px] text-slate-600">Show a notification preference for simulated run outcomes.</p></div><input aria-label="Execution summaries preference" type="checkbox" checked={email} onChange={e=>setEmail(e.target.checked)} className="h-4 w-4 accent-blue-400"/></label></section>
  <section className="panel rounded-xl p-5"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-300/10 text-amber-200"><ShieldCheck size={16}/></div><div><p className="text-[11px] font-bold text-slate-200">Simulation policy</p><p className="mt-1 text-[9px] text-slate-600">Always on · cannot be disabled here</p></div></div><p className="mt-4 text-[10px] leading-5 text-slate-500">FlowMind runs remain simulations in this environment. No integration credentials are configured, and no external action is performed.</p></section>
  <div className="flex items-center gap-3"><Button onClick={save}>{saved?<><Check size={13}/>Saved</>:<>Save preferences</>}</Button><span className="text-[9px] text-slate-600">Preferences are stored in this browser.</span></div>
 </div><aside className="space-y-4"><div className="panel rounded-xl p-4"><p className="font-mono text-[9px] uppercase tracking-[.16em] text-slate-500">Workspace details</p><div className="mt-4 space-y-3 text-[10px]"><div className="flex justify-between"><span className="text-slate-600">Plan</span><span className="text-slate-300">Team</span></div><div className="flex justify-between"><span className="text-slate-600">Members</span><span className="text-slate-300">1 member</span></div><div className="flex justify-between"><span className="text-slate-600">Connected services</span><span className="text-amber-200">0</span></div></div></div><div className="rounded-xl border border-[#30364b] bg-[#101421] p-4"><p className="flex items-center gap-2 text-[10px] font-bold text-slate-300"><CircleHelp size={13} className="text-blue-300"/>Need a hand?</p><p className="mt-2 text-[9px] leading-4 text-slate-500">For workflow structure, start with Templates or describe the routine in Create.</p><Link href="/templates" className="mt-3 inline-flex items-center gap-1 text-[9px] font-bold text-blue-300 no-underline">Explore templates<ArrowRight size={11}/></Link></div></aside></div>
 </>;
}

function NotFound() { return <div className="flex min-h-[60vh] flex-col items-center justify-center text-center"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-blue-300">404 · Not found</p><h1 className="mt-3 text-2xl font-bold text-slate-100">This route doesn’t exist.</h1><p className="mt-2 text-[11px] text-slate-500">Choose a workspace destination to continue.</p><Link href="/" className="mt-5"><Button><ArrowLeft size={13}/>Back to overview</Button></Link></div>; }

function Router() {
 return <Shell><Switch>
  <Route path="/" component={Dashboard}/>
  <Route path="/workflows" component={Workflows}/>
  <Route path="/create" component={CreateWorkflow}/>
  <Route path="/builder/:id" component={Builder}/>
  <Route path="/templates" component={Templates}/>
  <Route path="/executions/:id" component={ExecutionDetail}/>
  <Route path="/executions" component={Executions}/>
  <Route path="/integrations" component={Integrations}/>
  <Route path="/settings" component={Settings}/>
  <Route component={NotFound}/>
 </Switch></Shell>;
}
function App() { return <QueryClientProvider client={qc}><Router/></QueryClientProvider>; }
export default App;
