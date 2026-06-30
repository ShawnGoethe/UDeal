import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";
import { readFileSync } from "fs";
import { join } from "path";

const PUBLIC_DIR = join(__dirname, "../../public");

@Controller()
export class HomeController {
  @Get()
  getIndex(@Res() res: Response) {
    const html = readFileSync(join(PUBLIC_DIR, "index.html"), "utf-8");
    res.type("html").send(html);
  }
}
