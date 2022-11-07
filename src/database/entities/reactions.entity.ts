import { Entity, PrimaryGeneratedColumn, OneToOne, Column } from "typeorm";

@Entity()
export class ReactionsEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column("int", { array: true, default: [] })
  "&#128077": number[]; //👍️
  @Column("int", { array: true, default: [] })
  "&#128076": number[]; //👌
  @Column("int", { array: true, default: [] })
  "&#129505": number[]; //️/❤️
  @Column("int", { array: true, default: [] })
  "&#128064": number[]; //👀
  @Column("int", { array: true, default: [] })
  "&#128163": number[]; //💣
  @Column("int", { array: true, default: [] })
  "&#128165": number[]; //💥
  @Column("int", { array: true, default: [] })
  "&#127820": number[]; //🍌
  @Column("int", { array: true, default: [] })
  "&#9940": number[]; //⛔
}
