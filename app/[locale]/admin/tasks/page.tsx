"use client"

import { use, useCallback, useEffect, useState } from 'react'
import { useAdminRoute } from '@/lib/hooks'
import { getAllTasks, deactivateTask, updateTask } from '@/lib/admin'
import { getCurrentUser } from '@/lib/auth'
import AdminLoading from '@/components/admin/AdminPageLoading'
import { Eye, EyeOff, Plus, Lock, Unlock, Trash2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

interface TaskManagementProps {
  params: Promise<{ locale: string }>
}

export default function TaskManagementPage({ params }: TaskManagementProps) {
  const { locale } = use(params)
  const { isProtected } = useAdminRoute()
  const [loading, setLoading] = useState(true)
  const [adminId, setAdminId] = useState<string>('')
  const [tasks, setTasks] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterActive, setFilterActive] = useState<string>('active')
  const [actionLoading, setActionLoading] = useState<string>('')
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

  const formatRwfCompact = (value: number) => {
    const amount = Number(value || 0)

    if (amount >= 1_000_000) return `${Number((amount / 1_000_000).toFixed(1))}M RWF`
    if (amount >= 1_000) return `${Number((amount / 1_000).toFixed(1))}K RWF`

    return `${amount.toLocaleString()} RWF`
  }

  const loadTasks = useCallback(
    async (showLoader: boolean = false) => {
      if (!isProtected) return
      if (showLoader) setLoading(true)

      try {
        const currentUser = await getCurrentUser()
        if (currentUser) setAdminId(currentUser.id)

        const { tasks: fetchedTasks, total: totalCount } = await getAllTasks(50, page * 50, {
          category: filterCategory || undefined,
          is_active: filterActive === 'active' ? true : filterActive === 'inactive' ? false : undefined,
        })

        setTasks(fetchedTasks)
        setTotal(totalCount)
      } catch (error) {
        console.error('Error loading tasks:', error)
      } finally {
        if (showLoader) setLoading(false)
      }
    },
    [filterActive, filterCategory, isProtected, page]
  )

  useEffect(() => {
    loadTasks(true)
  }, [loadTasks])

  useEffect(() => {
    if (!isProtected) return
    const interval = setInterval(() => {
      loadTasks(false)
    }, 20000)

    return () => clearInterval(interval)
  }, [isProtected, loadTasks])

  const handleToggleActive = async (taskId: string, currentStatus: boolean) => {
    setActionLoading(taskId)
    try {
      if (currentStatus) {
        await deactivateTask(taskId, adminId)
      } else {
        await updateTask(taskId, { is_active: true }, adminId)
      }
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_active: !currentStatus } : t)))
    } catch (error) {
      console.error('Error toggling task:', error)
    } finally {
      setActionLoading('')
    }
  }

  const handleToggleUpsell = async (taskId: string, currentStatus: boolean) => {
    setActionLoading(taskId)
    try {
      await updateTask(taskId, { is_upsell: !currentStatus }, adminId)
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_upsell: !currentStatus } : t)))
    } catch (error) {
      console.error('Error toggling upsell status:', error)
    } finally {
      setActionLoading('')
    }
  }

  const handleDeleteTask = async () => {
    if (!deletingTaskId) return
    
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', deletingTaskId)
      if (error) throw error
      
      setTasks((prev) => prev.filter((t) => t.id !== deletingTaskId))
      setTotal((prev) => Math.max(0, prev - 1))
      setDeletingTaskId(null)
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  if (loading) {
    return <AdminLoading />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 text-white py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold">Task Management</h1>
              <p className="text-gray-300 mt-2">Monitor and manage all active tasks and campaigns</p>
            </div>
            <Link
              href={`/${locale}/admin/tasks/new`}
              className="hidden md:flex px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Task
            </Link>
          </div>

          {/* Filters */}
          <div className="grid md:grid-cols-3 gap-4">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 bg-slate-900 border border-white/20 rounded-lg text-white"
            >
              <option value="">All Categories</option>
              <option value="video">Video</option>
              <option value="click">Click</option>
              <option value="follow">Follow</option>
              <option value="subscribe">Subscribe</option>
              <option value="install">Install</option>
            </select>

            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="px-4 py-2 bg-slate-900 border border-white/20 rounded-lg text-white"
            >
              <option value="both">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          <Link
            href={`/${locale}/admin/tasks/new`}
            className="md:hidden mt-4 w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </Link>
        </div>

        {/* Tasks Grid */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="p-6">
            {tasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {tasks.map((task: any) => {
                  const totalBudget = Number(task.total_budget || 0)
                  const remainingBudget = Number(task.remaining_budget || 0)
                  const spent = totalBudget - remainingBudget
                  const progress = (spent / Math.max(totalBudget, 1)) * 100

                  return (
                    <article
                      key={task.id}
                      className="rounded-xl border border-white/10 bg-slate-900/80 p-4 hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-white truncate">{task.title}</h3>
                          <span className="text-xs text-gray-400 block">
                            {(task.description || '').length > 80
                              ? `${task.description.substring(0, 80)}...`
                              : task.description || 'No description'}
                          </span>
                        </div>
                        <span className="shrink-0 px-2 py-1 bg-purple-900/40 text-purple-400 rounded text-xs font-semibold">
                          {(task.category || '').toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                        <div className="rounded-lg bg-white/5 p-3">
                          <span className="text-xs text-gray-400 mb-1 block">Base Reward</span>
                          <p className="text-white font-semibold">{formatRwfCompact(Number(task.base_reward || 0))}</p>
                        </div>
                        <div className="rounded-lg bg-white/5 p-3">
                          <span className="text-xs text-gray-400 mb-1 block">Completions</span>
                          <p className="text-white font-semibold">{(task.completion_count || 0).toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg bg-white/5 p-3">
                          <span className="text-xs text-gray-400 mb-1 block">Total Budget</span>
                          <p className="text-gray-300 font-semibold">{formatRwfCompact(totalBudget)}</p>
                        </div>
                      </div>

                      {task.is_upsell && (
                        <div className="mb-3 px-3 py-2 bg-amber-900/30 border border-amber-500/30 rounded-lg flex items-center gap-2">
                          <Lock className="w-3 h-3 text-amber-400" />
                          <p className="text-[4px] text-amber-200">Restricted</p>
                        </div>
                      )}

                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <p className="text-gray-400">Remaining</p>
                          <p className="text-emerald-400 font-semibold">{formatRwfCompact(remainingBudget)}</p>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-500 to-red-500 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {task.is_active ? (
                          <span className="px-2 py-1 bg-green-900/40 text-green-400 rounded text-xs font-semibold">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-900/40 text-gray-400 rounded text-xs font-semibold">
                            Inactive
                          </span>
                        )}

                        <button
                          onClick={() => handleToggleUpsell(task.id, task.is_upsell)}
                          disabled={actionLoading === task.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                            task.is_upsell
                              ? 'bg-amber-600 hover:bg-amber-500 text-white'
                              : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                          }`}
                          title={task.is_upsell ? 'Remove restriction' : 'Restrict task (Upsell)'}
                        >
                          {task.is_upsell ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          {task.is_upsell ? 'Unlock' : 'Restrict'}
                        </button>

                        <button
                          onClick={() => setDeletingTaskId(task.id)}
                          disabled={actionLoading === task.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-500/20"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>

                        <button
                          onClick={() => handleToggleActive(task.id, task.is_active)}
                          disabled={actionLoading === task.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                            task.is_active
                              ? 'bg-red-600 hover:bg-red-500 text-white'
                              : 'bg-gray-600 hover:bg-gray-500'
                          }`}
                          title={task.is_active ? 'Deactivate task' : 'Activate task'}
                        >
                          {task.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          {task.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400">No tasks found</div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-6 border-t border-white/10">
            <p className="text-sm text-gray-400">
              Showing {Math.min((page + 1) * 50, total)} of {total} tasks
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * 50 >= total}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-red-400">
              <div className="p-3 bg-red-900/20 rounded-full">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Delete Task</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this task? This action cannot be undone and will remove all associated data including completions.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingTaskId(null)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
