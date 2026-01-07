import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Get admin credentials from environment variables
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@portal.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminName = process.env.ADMIN_NAME || 'Admin User';

  // Create admin user from env
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPasswordHash,
      name: adminName,
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      name: adminName,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log('✅ Created/Updated admin user:', admin.email);

  // Create sample manager
  const managerPassword = await bcrypt.hash('manager123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@portal.com' },
    update: {},
    create: {
      email: 'manager@portal.com',
      passwordHash: managerPassword,
      name: 'Sample Manager',
      role: UserRole.MANAGER,
      isActive: true,
      ratePerOrder: 5.0,
    },
  });

  console.log('✅ Created/Updated manager user:', manager.email);

  // Create sample employee
  const employeePassword = await bcrypt.hash('employee123', 10);
  const employee = await prisma.user.upsert({
    where: { email: 'employee@portal.com' },
    update: {},
    create: {
      email: 'employee@portal.com',
      passwordHash: employeePassword,
      name: 'Sample Employee',
      role: UserRole.EMPLOYEE,
      isActive: true,
      ratePerOrder: 3.0,
    },
  });

  console.log('✅ Created/Updated employee user:', employee.email);

  // Create team assignment (manager -> employee)
  await prisma.teamAssignment.upsert({
    where: {
      managerId_employeeId: {
        managerId: manager.id,
        employeeId: employee.id,
      },
    },
    update: {},
    create: {
      managerId: manager.id,
      employeeId: employee.id,
    },
  });

  console.log('✅ Created team assignment: Manager -> Employee');

  console.log('\n🎉 Seeding completed!');
  console.log('\n📝 Default credentials:');
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);
  console.log('Manager: manager@portal.com / manager123');
  console.log('Employee: employee@portal.com / employee123');
  console.log('\n💡 To customize admin credentials, set ADMIN_EMAIL and ADMIN_PASSWORD env variables');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

