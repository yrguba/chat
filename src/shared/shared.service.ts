import { Injectable } from "@nestjs/common";

@Injectable()
export class SharedService {
  getHello() {
    return "hello";
  }
}
