import { render } from "vike/abort";

export default function () {
  throw render(`/custom?page={"title":"b"}`);
}
