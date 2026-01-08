import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get employee options for dropdowns
   * For managers: respects team scoping if assignments exist
   * For admins: returns all employees
   */
  async getEmployeeOptions(userId: string, userRole: UserRole) {
    const where: any = {
      role: 'EMPLOYEE',
      isActive: true,
    };

    // If user is a manager, check team assignments
    if (userRole === UserRole.MANAGER) {
      const assignments = await this.prisma.teamAssignment.findMany({
        where: { managerId: userId },
        select: { employeeId: true },
      });

      const hasAssignments = assignments.length > 0;
      if (hasAssignments) {
        // Only show assigned employees
        const employeeIds = assignments.map((a) => a.employeeId);
        where.id = { in: employeeIds };
      }
      // If no assignments, show all employees (manager can act on all employees)
    }

    const employees = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return employees;
  }
}

