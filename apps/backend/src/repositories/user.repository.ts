import { prisma, User } from '@eipms/database';
import { CreateUserInput, UpdateUserInput } from '@eipms/shared';

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  async findByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email }
    });
  }

  async create(data: CreateUserInput & { passwordHash: string }) {
    return prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          username: data.username,
          email: data.email,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          isActive: true
        }
      });

      // Map roles
      if (data.roleIds && data.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: data.roleIds.map((roleId: string) => ({
            userId: user.id,
            roleId
          }))
        });
      }

      return user;
    });
  }

  async update(id: string, data: UpdateUserInput & { passwordHash?: string }) {
    return prisma.$transaction(async (tx: any) => {
      const updateData: any = {};
      if (data.email) updateData.email = data.email;
      if (data.firstName) updateData.firstName = data.firstName;
      if (data.lastName) updateData.lastName = data.lastName;
      if (data.passwordHash) updateData.passwordHash = data.passwordHash;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const user = await tx.user.update({
        where: { id },
        data: updateData
      });

      if (data.roleIds) {
        // Delete old roles
        await tx.userRole.deleteMany({ where: { userId: id } });

        // Add new roles
        if (data.roleIds.length > 0) {
          await tx.userRole.createMany({
            data: data.roleIds.map((roleId: string) => ({
              userId: id,
              roleId
            }))
          });
        }
      }

      return user;
    });
  }

  async delete(id: string) {
    return prisma.user.delete({
      where: { id }
    });
  }

  async findAll() {
    return prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
  }

  async findRoles() {
    return prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });
  }

  async findPermissions() {
    return prisma.permission.findMany();
  }
}
export const userRepository = new UserRepository();
