import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { UserEntity } from "./user.entity";

@Entity()
export class ContactEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ nullable: false })
  phone: string;
  @Column({ nullable: true })
  name: string;
  @Column({ nullable: true })
  owner: number;
  @Column({ nullable: true })
  user_id: number;
  @ManyToOne(() => UserEntity, (user) => user.contact, {
    onDelete: "CASCADE",
  })
  user: UserEntity;
}
