// Note: Financial repositories have been removed as part of the Team Management System migration.
// New repositories will be added in task 4:
// - TeamMemberRepository
// - TaskRepository
// - AllocationRepository

class RepositoryCache {
  // TODO: Add team management repositories here (Task 4)
  // private _teamMemberRepository: TeamMemberRepository | null = null;
  // private _taskRepository: TaskRepository | null = null;
  // private _allocationRepository: AllocationRepository | null = null;

  clear(): void {
    // Reset all repository instances
    // TODO: Clear team management repositories when added
  }
}

export const repositoryCache = new RepositoryCache();
