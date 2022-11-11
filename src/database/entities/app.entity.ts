import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class AppEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ nullable: false })
  version: number;
  @Column({ nullable: true })
  path: string;
}
