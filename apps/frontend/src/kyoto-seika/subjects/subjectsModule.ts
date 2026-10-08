import raw from "./subjects.json";
import notices from "./NOTICES.txt?raw";
import { parseSubjectList } from "../subjectList";

/**
 * The Kyoto Seika Subjects and their licence and notices, in one chunk, loaded only for a sheet drawn
 * in Kyoto Seika Practice Mode.
 */
export const SUBJECTS = parseSubjectList(raw);
export const NOTICES = notices;
