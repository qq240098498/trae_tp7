import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Tag,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type { Project, ProjectCategory } from '@/types';

const CATEGORY_COLORS = [
  { bg: 'bg-sandalwood-100', text: 'text-sandalwood-700', border: 'border-sandalwood-200' },
  { bg: 'bg-jade-100', text: 'text-jade-700', border: 'border-jade-200' },
  { bg: 'bg-gold-100', text: 'text-gold-700', border: 'border-gold-200' },
  { bg: 'bg-jade-50', text: 'text-jade-600', border: 'border-jade-100' },
];

const getCategoryColor = (index: number) => CATEGORY_COLORS[index % CATEGORY_COLORS.length];

type StatusFilter = 'all' | 'active' | 'inactive';

interface ProjectFormData {
  name: string;
  categoryId: string;
  duration: string;
  price: string;
  commissionRate: string;
  description: string;
  technicianIds: string[];
  isActive: boolean;
}

interface CategoryFormData {
  name: string;
  description: string;
  sort: string;
}

export default function ProjectManagement() {
  const {
    projectCategories,
    projects,
    technicians,
    addProject,
    updateProject,
    deleteProject,
    saveToStorage,
  } = useAppStore();

  const setCategoriesDirectly = (newCategories: ProjectCategory[]) => {
    useAppStore.setState({ projectCategories: newCategories });
    saveToStorage();
  };

  const setTechniciansDirectly = (updater: (prev: typeof technicians) => typeof technicians) => {
    useAppStore.setState((s) => ({ technicians: updater(s.technicians) }));
    saveToStorage();
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectFormData>({
    name: '',
    categoryId: '',
    duration: '',
    price: '',
    commissionRate: '30',
    description: '',
    technicianIds: [],
    isActive: true,
  });
  const [projectFormErrors, setProjectFormErrors] = useState<Partial<Record<keyof ProjectFormData, string>>>({});

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProjectCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: '',
    description: '',
    sort: '',
  });
  const [categoryFormErrors, setCategoryFormErrors] = useState<Partial<Record<keyof CategoryFormData, string>>>({});

  const [confirmDelete, setConfirmDelete] = useState<{ type: 'project' | 'category'; id: string; name: string } | null>(null);

  const sortedCategories = useMemo(
    () => [...projectCategories].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
    [projectCategories]
  );

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (activeCategoryId !== 'all' && p.categoryId !== activeCategoryId) return false;
      if (statusFilter === 'active' && !p.isActive) return false;
      if (statusFilter === 'inactive' && p.isActive) return false;
      return true;
    });
  }, [projects, searchQuery, activeCategoryId, statusFilter]);

  const getTechniciansForProject = (projectId: string) => {
    return technicians.filter((t) => t.projectIds.includes(projectId));
  };

  const getCategoryName = (categoryId: string) => {
    return projectCategories.find((c) => c.id === categoryId)?.name ?? '未分类';
  };

  const getCategoryIndex = (categoryId: string) => {
    const idx = sortedCategories.findIndex((c) => c.id === categoryId);
    return idx >= 0 ? idx : 0;
  };

  const openAddProjectModal = () => {
    setEditingProject(null);
    setProjectForm({
      name: '',
      categoryId: sortedCategories[0]?.id ?? '',
      duration: '',
      price: '',
      commissionRate: '30',
      description: '',
      technicianIds: [],
      isActive: true,
    });
    setProjectFormErrors({});
    setIsProjectModalOpen(true);
  };

  const openEditProjectModal = (project: Project) => {
    setEditingProject(project);
    const techIds = technicians.filter((t) => t.projectIds.includes(project.id)).map((t) => t.id);
    setProjectForm({
      name: project.name,
      categoryId: project.categoryId,
      duration: String(project.duration),
      price: String(project.price),
      commissionRate: String(project.commissionRate ?? 30),
      description: project.description ?? '',
      technicianIds: techIds,
      isActive: project.isActive,
    });
    setProjectFormErrors({});
    setIsProjectModalOpen(true);
  };

  const validateProjectForm = () => {
    const errors: Partial<Record<keyof ProjectFormData, string>> = {};
    if (!projectForm.name.trim()) errors.name = '请输入项目名称';
    if (!projectForm.categoryId) errors.categoryId = '请选择所属分类';
    if (!projectForm.duration || Number(projectForm.duration) <= 0) errors.duration = '时长必须大于0';
    if (!projectForm.price || Number(projectForm.price) <= 0) errors.price = '价格必须大于0';
    const rate = Number(projectForm.commissionRate);
    if (projectForm.commissionRate === '' || isNaN(rate) || rate < 0 || rate > 100) {
      errors.commissionRate = '提成比例必须在0-100之间';
    }
    setProjectFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProject = () => {
    if (!validateProjectForm()) return;

    const baseProject = {
      name: projectForm.name.trim(),
      categoryId: projectForm.categoryId,
      duration: Number(projectForm.duration),
      price: Number(projectForm.price),
      commissionRate: Number(projectForm.commissionRate),
      description: projectForm.description.trim() || undefined,
      isActive: projectForm.isActive,
    };

    let projectId: string;
    if (editingProject) {
      projectId = editingProject.id;
      updateProject(projectId, baseProject);
    } else {
      const tempId = `new-${Date.now()}`;
      addProject(baseProject);
      const state = useAppStore.getState();
      const created = state.projects.find(
        (p) =>
          p.name === baseProject.name &&
          p.categoryId === baseProject.categoryId &&
          p.price === baseProject.price &&
          p.duration === baseProject.duration
      );
      projectId = created?.id ?? tempId;
    }

    setTechniciansDirectly((prevTechs) =>
      prevTechs.map((t) => {
        const isSelected = projectForm.technicianIds.includes(t.id);
        const hasProject = t.projectIds.includes(projectId);
        if (isSelected && !hasProject) {
          return { ...t, projectIds: [...t.projectIds, projectId] };
        }
        if (!isSelected && hasProject) {
          return { ...t, projectIds: t.projectIds.filter((id) => id !== projectId) };
        }
        return t;
      })
    );

    setIsProjectModalOpen(false);
  };

  const handleDeleteProject = (id: string, name: string) => {
    setConfirmDelete({ type: 'project', id, name });
  };

  const confirmDeleteProject = () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    deleteProject(id);
    setTechniciansDirectly((prevTechs) =>
      prevTechs.map((t) => ({
        ...t,
        projectIds: t.projectIds.filter((pid) => pid !== id),
      }))
    );
    setConfirmDelete(null);
  };

  const openCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', sort: String((sortedCategories.length + 1)) });
    setCategoryFormErrors({});
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (cat: ProjectCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description ?? '',
      sort: String(cat.sort ?? ''),
    });
    setCategoryFormErrors({});
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', sort: String((sortedCategories.length + 1)) });
    setCategoryFormErrors({});
  };

  const validateCategoryForm = () => {
    const errors: Partial<Record<keyof CategoryFormData, string>> = {};
    if (!categoryForm.name.trim()) errors.name = '请输入分类名称';
    setCategoryFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCategory = () => {
    if (!validateCategoryForm()) return;

    const generateId = () => `pc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    if (editingCategory) {
      const updated = projectCategories.map((c) =>
        c.id === editingCategory.id
          ? {
              ...c,
              name: categoryForm.name.trim(),
              description: categoryForm.description.trim() || undefined,
              sort: categoryForm.sort ? Number(categoryForm.sort) : undefined,
            }
          : c
      );
      setCategoriesDirectly(updated);
    } else {
      const newCat: ProjectCategory = {
        id: generateId(),
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || undefined,
        sort: categoryForm.sort ? Number(categoryForm.sort) : sortedCategories.length + 1,
      };
      setCategoriesDirectly([...projectCategories, newCat]);
    }
    resetCategoryForm();
  };

  const handleDeleteCategory = (id: string, name: string) => {
    setConfirmDelete({ type: 'category', id, name });
  };

  const confirmDeleteCategory = () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    const filtered = projectCategories.filter((c) => c.id !== id);
    setCategoriesDirectly(filtered);
    if (activeCategoryId === id) setActiveCategoryId('all');
    setConfirmDelete(null);
  };

  const executeConfirmDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'project') confirmDeleteProject();
    else confirmDeleteCategory();
  };

  useEffect(() => {
    if (!projectForm.categoryId && sortedCategories.length > 0 && !editingProject) {
      setProjectForm((f) => ({ ...f, categoryId: sortedCategories[0].id }));
    }
  }, [sortedCategories, editingProject, projectForm.categoryId]);

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-ink-500 tracking-tight">项目管理</h1>
            <p className="text-ink-300 mt-1">管理理疗项目和分类</p>
          </div>
          <div className="flex gap-3">
            <button className="btn-outline flex items-center gap-2" onClick={openCategoryModal}>
              <Tag size={18} />
              管理分类
            </button>
            <button className="btn-primary flex items-center gap-2" onClick={openAddProjectModal}>
              <Plus size={18} />
              新增项目
            </button>
          </div>
        </div>

        <div className="card p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-300" size={18} />
              <input
                type="text"
                placeholder="搜索项目名称..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-11"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'active', 'inactive'] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    statusFilter === s
                      ? 'bg-sandalwood-500 text-white'
                      : 'bg-cream-100 text-ink-400 hover:bg-cream-200'
                  )}
                >
                  {s === 'all' ? '全部' : s === 'active' ? '启用' : '停用'}
                </button>
              ))}
            </div>
          </div>

          <div className="divider-x" />

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategoryId('all')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border',
                activeCategoryId === 'all'
                  ? 'bg-ink-500 text-white border-ink-500'
                  : 'bg-white text-ink-500 border-cream-300 hover:border-ink-300'
              )}
            >
              全部
            </button>
            {sortedCategories.map((cat, idx) => {
              const color = getCategoryColor(idx);
              const isActive = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border',
                    isActive
                      ? `${color.bg} ${color.text} ${color.border}`
                      : 'bg-white text-ink-500 border-cream-300 hover:border-ink-300'
                  )}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-cream-100">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-ink-500 whitespace-nowrap">项目名称</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-ink-500 whitespace-nowrap">分类</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-ink-500 whitespace-nowrap">时长(分钟)</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-ink-500 whitespace-nowrap">价格(¥)</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-ink-500 whitespace-nowrap">提成比例</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-ink-500 whitespace-nowrap">适用技师</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-ink-500 whitespace-nowrap">状态</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-ink-500 whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-ink-300">
                      暂无项目数据
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((project) => {
                    const techs = getTechniciansForProject(project.id);
                    const catIdx = getCategoryIndex(project.categoryId);
                    const color = getCategoryColor(catIdx);
                    return (
                      <tr
                        key={project.id}
                        className="border-t border-cream-200 transition-colors duration-150 hover:bg-cream-100"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-ink-500">{project.name}</div>
                          {project.description && (
                            <div className="text-sm text-ink-300 mt-0.5 line-clamp-1">{project.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn('tag', color.bg, color.text)}>{getCategoryName(project.categoryId)}</span>
                        </td>
                        <td className="px-6 py-4 text-ink-500">{project.duration}</td>
                        <td className="px-6 py-4 font-medium text-sandalwood-600">¥{project.price}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-rose-50 text-rose-700 border border-rose-100">
                            {project.commissionRate ?? 0}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className="relative group inline-block"
                            title={techs.length > 0 ? techs.map((t) => t.name).join('、') : '暂无技师'}
                          >
                            <span className="tag bg-cream-200 text-ink-500 cursor-help">
                              {techs.length}位技师
                            </span>
                            {techs.length > 0 && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                <div className="bg-ink-500 text-white text-sm rounded-lg px-3 py-2 whitespace-nowrap shadow-modal">
                                  {techs.map((t) => t.name).join('、')}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {project.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-jade-100 text-jade-700">
                              <ToggleRight size={16} className="text-jade-600" />
                              启用
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-ink-100 text-ink-400">
                              <ToggleLeft size={16} />
                              停用
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditProjectModal(project)}
                              className="p-2 rounded-lg text-ink-300 hover:text-sandalwood-500 hover:bg-sandalwood-50 transition-all duration-200"
                              title="编辑"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteProject(project.id, project.name)}
                              className="p-2 rounded-lg text-ink-300 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                              title="删除"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsProjectModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-cream-200">
              <h2 className="text-xl font-bold text-ink-500">
                {editingProject ? '编辑项目' : '新增项目'}
              </h2>
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="p-2 rounded-lg text-ink-300 hover:text-ink-500 hover:bg-cream-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-160px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">
                    项目名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="请输入项目名称"
                    className={cn('input-field', projectFormErrors.name && 'border-red-400 focus:border-red-400 focus:ring-red-100')}
                  />
                  {projectFormErrors.name && (
                    <p className="text-red-500 text-xs mt-1">{projectFormErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">
                    所属分类 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={projectForm.categoryId}
                      onChange={(e) => setProjectForm((f) => ({ ...f, categoryId: e.target.value }))}
                      className={cn(
                        'input-field appearance-none pr-10 cursor-pointer',
                        projectFormErrors.categoryId && 'border-red-400 focus:border-red-400 focus:ring-red-100'
                      )}
                    >
                      <option value="">请选择分类</option>
                      {sortedCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none" size={18} />
                  </div>
                  {projectFormErrors.categoryId && (
                    <p className="text-red-500 text-xs mt-1">{projectFormErrors.categoryId}</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-ink-500 mb-1.5">
                      时长(分钟) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={projectForm.duration}
                      onChange={(e) => setProjectForm((f) => ({ ...f, duration: e.target.value }))}
                      placeholder="60"
                      className={cn('input-field', projectFormErrors.duration && 'border-red-400 focus:border-red-400 focus:ring-red-100')}
                    />
                    {projectFormErrors.duration && (
                      <p className="text-red-500 text-xs mt-1">{projectFormErrors.duration}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-500 mb-1.5">
                      价格(¥) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={projectForm.price}
                      onChange={(e) => setProjectForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="168"
                      className={cn('input-field', projectFormErrors.price && 'border-red-400 focus:border-red-400 focus:ring-red-100')}
                    />
                    {projectFormErrors.price && (
                      <p className="text-red-500 text-xs mt-1">{projectFormErrors.price}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-500 mb-1.5">
                      提成比例(%) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={projectForm.commissionRate}
                      onChange={(e) => setProjectForm((f) => ({ ...f, commissionRate: e.target.value }))}
                      placeholder="30"
                      className={cn('input-field', projectFormErrors.commissionRate && 'border-red-400 focus:border-red-400 focus:ring-red-100')}
                    />
                    {projectFormErrors.commissionRate && (
                      <p className="text-red-500 text-xs mt-1">{projectFormErrors.commissionRate}</p>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">项目描述</label>
                  <textarea
                    rows={3}
                    value={projectForm.description}
                    onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="请输入项目描述（可选）"
                    className="input-field resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-ink-500 mb-2">适用技师</label>
                  <div className="border border-cream-200 rounded-xl p-4 bg-cream-50 max-h-52 overflow-y-auto">
                    {technicians.length === 0 ? (
                      <p className="text-sm text-ink-300 text-center py-4">暂无技师数据</p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {technicians.map((tech) => {
                          const checked = projectForm.technicianIds.includes(tech.id);
                          return (
                            <label
                              key={tech.id}
                              className={cn(
                                'flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all duration-200 border',
                                checked
                                  ? 'bg-sandalwood-50 border-sandalwood-300'
                                  : 'bg-white border-cream-200 hover:border-cream-300'
                              )}
                            >
                              <div
                                className={cn(
                                  'w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
                                  checked ? 'bg-sandalwood-500 border-sandalwood-500' : 'border-ink-300'
                                )}
                              >
                                {checked && <Check size={10} className="text-white" />}
                              </div>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const ids = e.target.checked
                                    ? [...projectForm.technicianIds, tech.id]
                                    : projectForm.technicianIds.filter((id) => id !== tech.id);
                                  setProjectForm((f) => ({ ...f, technicianIds: ids }));
                                }}
                                className="sr-only"
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-ink-500 truncate">{tech.name}</div>
                                {tech.position && (
                                  <div className="text-xs text-ink-300 truncate">{tech.position}</div>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-ink-500 mb-2">是否启用</label>
                  <button
                    type="button"
                    onClick={() => setProjectForm((f) => ({ ...f, isActive: !f.isActive }))}
                    className={cn(
                      'relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200',
                      projectForm.isActive ? 'bg-jade-500' : 'bg-ink-200'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200',
                        projectForm.isActive ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                  <span className="ml-3 text-sm text-ink-400">
                    {projectForm.isActive ? '已启用' : '已停用'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-cream-200 bg-cream-50">
              <button className="btn-ghost" onClick={() => setIsProjectModalOpen(false)}>
                取消
              </button>
              <button className="btn-primary" onClick={handleSaveProject}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => {
              setIsCategoryModalOpen(false);
              resetCategoryForm();
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-4xl max-h-[90vh] overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-cream-200">
              <h2 className="text-xl font-bold text-ink-500">分类管理</h2>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  resetCategoryForm();
                }}
                className="p-2 rounded-lg text-ink-300 hover:text-ink-500 hover:bg-cream-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="border-r border-cream-200 max-h-[calc(90vh-140px)] overflow-y-auto">
                <div className="p-4 border-b border-cream-100 bg-cream-50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-ink-500">现有分类</h3>
                    <span className="text-sm text-ink-300">{sortedCategories.length} 个分类</span>
                  </div>
                </div>
                <div className="p-3">
                  {sortedCategories.length === 0 ? (
                    <p className="text-center text-ink-300 py-12">暂无分类</p>
                  ) : (
                    <div className="space-y-2">
                      {sortedCategories.map((cat, idx) => {
                        const color = getCategoryColor(idx);
                        const isEditing = editingCategory?.id === cat.id;
                        return (
                          <div
                            key={cat.id}
                            className={cn(
                              'p-4 rounded-xl border transition-all duration-200',
                              isEditing
                                ? 'bg-sandalwood-50 border-sandalwood-300 shadow-sm'
                                : 'bg-white border-cream-200 hover:border-cream-300'
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={cn('tag', color.bg, color.text)}>{cat.name}</span>
                                  {cat.sort !== undefined && (
                                    <span className="text-xs text-ink-300">#{cat.sort}</span>
                                  )}
                                </div>
                                {cat.description && (
                                  <p className="text-sm text-ink-300 line-clamp-2">{cat.description}</p>
                                )}
                                <p className="text-xs text-ink-300 mt-1.5">
                                  {projects.filter((p) => p.categoryId === cat.id).length} 个项目
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => openEditCategory(cat)}
                                  className={cn(
                                    'p-2 rounded-lg transition-all duration-200',
                                    isEditing
                                      ? 'text-sandalwood-600 bg-sandalwood-100'
                                      : 'text-ink-300 hover:text-sandalwood-500 hover:bg-sandalwood-50'
                                  )}
                                  title="编辑"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                  className="p-2 rounded-lg text-ink-300 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                                  title="删除"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="max-h-[calc(90vh-140px)] overflow-y-auto">
                <div className="p-4 border-b border-cream-100 bg-cream-50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-ink-500">
                      {editingCategory ? '编辑分类' : '新增分类'}
                    </h3>
                    {editingCategory && (
                      <button
                        onClick={resetCategoryForm}
                        className="text-sm text-ink-300 hover:text-ink-500 transition-colors"
                      >
                        取消编辑
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-ink-500 mb-1.5">
                      分类名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="请输入分类名称"
                      className={cn('input-field', categoryFormErrors.name && 'border-red-400 focus:border-red-400 focus:ring-red-100')}
                    />
                    {categoryFormErrors.name && (
                      <p className="text-red-500 text-xs mt-1">{categoryFormErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-500 mb-1.5">分类描述</label>
                    <textarea
                      rows={3}
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="请输入分类描述（可选）"
                      className="input-field resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-500 mb-1.5">排序</label>
                    <input
                      type="number"
                      min="0"
                      value={categoryForm.sort}
                      onChange={(e) => setCategoryForm((f) => ({ ...f, sort: e.target.value }))}
                      placeholder="数字越小越靠前"
                      className="input-field"
                    />
                  </div>
                  <div className="pt-4">
                    <button
                      className="w-full btn-primary flex items-center justify-center gap-2"
                      onClick={handleSaveCategory}
                    >
                      <Check size={18} />
                      {editingCategory ? '保存修改' : '添加分类'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setConfirmDelete(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-sm animate-fade-up">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="text-red-500" size={28} />
              </div>
              <h3 className="text-lg font-bold text-ink-500 mb-2">确认删除</h3>
              <p className="text-sm text-ink-300 mb-6">
                确定要删除{confirmDelete.type === 'project' ? '项目' : '分类'}
                <span className="font-medium text-ink-500 mx-1">「{confirmDelete.name}」</span>
                吗？
                <br />
                {confirmDelete.type === 'project'
                  ? '删除后将无法恢复，关联的技师适配关系也将解除。'
                  : '删除后分类下的项目将变为未分类状态。'}
              </p>
              <div className="flex gap-3">
                <button
                  className="flex-1 btn-outline"
                  onClick={() => setConfirmDelete(null)}
                >
                  取消
                </button>
                <button
                  className="flex-1 bg-red-500 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:bg-red-600 active:bg-red-700"
                  onClick={executeConfirmDelete}
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
