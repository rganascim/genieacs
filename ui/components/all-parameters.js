"use strict";

import m from "mithril";
import * as components from "../components";
import * as taskQueue from "../task-queue";
import longTextComponent from "../long-text-component";
import * as expression from "../../lib/common/expression";
import memoize from "../../lib/common/memoize";

const memoizedParse = memoize(expression.parse);

function escapeRegExp(str) {
  return str.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
}

const component = {
  view: vnode => {
    const device = vnode.attrs.device;

    const search = m("input", {
      type: "text",
      placeholder: "Search parameters",
      oninput: e => {
        vnode.state.searchString = e.target.value;
        e.redraw = false;
        clearTimeout(vnode.state.timeout);
        vnode.state.timeout = setTimeout(m.redraw, 500);
      }
    });

    const instanceRegex = /\.[0-9]+$/;
    let re;
    if (vnode.state.searchString) {
      const keywords = vnode.state.searchString.split(" ").filter(s => s);
      if (keywords.length)
        re = new RegExp(keywords.map(s => escapeRegExp(s)).join(".*"), "i");
    }

    const rows = Object.keys(device)
      .sort()
      .map(k => {
        const p = device[k];
        const val = [];
        const attrs = {};
        if (re) {
          const str = p.value && p.value[0] ? `${k} ${p.value[0]}` : k;
          if (!re.test(str)) attrs.style = "display: none;";
        }

        if (p.object === false) {
          val.push(
            m(
              components.get("parameter"),
              Object.assign({ device: device, parameter: memoizedParse(k) })
            )
          );
        } else if (p.object && p.writable) {
          if (instanceRegex.test(k)) {
            val.push(
              m(
                "button",
                {
                  title: "Delete this instance",
                  onclick: () => {
                    taskQueue.queueTask({
                      name: "deleteObject",
                      device: device["DeviceID.ID"].value[0],
                      objectName: k
                    });
                  }
                },
                "✕"
              )
            );
          } else {
            val.push(
              m(
                "button",
                {
                  title: "Create a new instance",
                  onclick: () => {
                    taskQueue.queueTask({
                      name: "addObject",
                      device: device["DeviceID.ID"].value[0],
                      objectName: k
                    });
                  }
                },
                "🞢"
              )
            );
          }
        }

        val.push(
          m(
            "button",
            {
              title: "Refresh tree",
              onclick: () => {
                taskQueue.queueTask({
                  name: "getParameterValues",
                  device: device["DeviceID.ID"].value[0],
                  parameterNames: [k]
                });
              }
            },
            "↺"
          )
        );

        return m(
          "tr",
          attrs,
          m("td.left", m(longTextComponent, { text: k })),
          m("td.right", val)
        );
      });

    return m(
      ".all-parameters",
      m(
        "a.download-csv",
        {
          href: `/api/devices/${device["DeviceID.ID"].value[0]}.csv`,
          download: "",
          style: "float: right;"
        },
        "Download"
      ),
      search,
      m(".parameter-list", m("table", m("tbody", rows)))
    );
  }
};

export default component;
