/*
 * src/story-data.js —— 由 data/story.json 生成的浏览器侧数据绑定（勿手改）。
 *
 * 唯一真源是 data/story.json；scripts/build.mjs 每次构建都会重新生成本文件，
 * 保证「只有一份声音事件清单、只有一份镜头数据」。
 */
(function (root, factory) {
  var story = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = story;
  } else {
    root.CriedWolf = root.CriedWolf || {};
    root.CriedWolf.story = story;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return {
  "meta": {
    "title": "狼来了",
    "subtitle": "回声的代价",
    "totalDuration": 150,
    "fps": 30,
    "frameCount": 4500,
    "stageWidth": 1600,
    "stageHeight": 900,
    "sampleRate": 48000,
    "sections": [
      "序章",
      "第一次谎言",
      "第二次谎言",
      "真狼",
      "尾声"
    ]
  },
  "music": {
    "bpm": 80,
    "beatSec": 0.75,
    "barSec": 3,
    "key": "D natural minor",
    "progression": [
      {
        "from": 0,
        "to": 100,
        "cycle": [
          "Dm",
          "Bb",
          "Gm",
          "A"
        ]
      },
      {
        "from": 100,
        "to": 141,
        "cycle": [
          "Dm",
          "Eb",
          "Dm",
          "A"
        ]
      },
      {
        "from": 141,
        "to": 150,
        "cycle": [
          "Dm"
        ]
      }
    ],
    "theme": [
      293.66,
      349.23,
      440
    ],
    "themeDurations": [
      0.3,
      0.3,
      0.6
    ],
    "chordRoots": {
      "Dm": 146.83,
      "Bb": 116.54,
      "Gm": 98,
      "A": 110,
      "Eb": 155.56
    },
    "chordIntervals": {
      "Dm": [
        0,
        3,
        7,
        12
      ],
      "Bb": [
        -2,
        2,
        5,
        10
      ],
      "Gm": [
        -5,
        0,
        3,
        7
      ],
      "A": [
        -3,
        2,
        4,
        7
      ],
      "Eb": [
        -4,
        0,
        3,
        7
      ]
    }
  },
  "shots": [
    {
      "id": "s01",
      "index": 1,
      "title": "风吹过的山谷",
      "start": 0,
      "end": 8,
      "section": "序章",
      "palette": "day",
      "transition": {
        "type": "crossfade",
        "start": 7.4,
        "duration": 0.6
      },
      "captionCues": [
        {
          "start": 3,
          "end": 7.2,
          "text": "从前，山坡上住着一个放羊的少年。"
        }
      ],
      "camera": [
        {
          "t": 0,
          "x": 0,
          "y": 0,
          "scale": 1
        },
        {
          "t": 8,
          "x": -12,
          "y": 0,
          "scale": 1.035
        }
      ],
      "actorKeys": {
        "boy": [],
        "wolf": [],
        "villagers": [],
        "sheep": []
      },
      "effectIds": [
        "opening-title",
        "sun-disc",
        "bell-stamp"
      ],
      "cast": {
        "sheep": 0,
        "villagers": [],
        "boy": false,
        "wolf": false,
        "spread": 1
      }
    },
    {
      "id": "s02",
      "index": 2,
      "title": "村与坡",
      "start": 8,
      "end": 18,
      "section": "序章",
      "palette": "day",
      "transition": {
        "type": "crossfade",
        "start": 17.6,
        "duration": 0.4
      },
      "captionCues": [
        {
          "start": 9,
          "end": 15,
          "text": "村庄在坡下，羊群在坡上。"
        }
      ],
      "camera": [
        {
          "t": 8,
          "x": 0,
          "y": 0,
          "scale": 1
        },
        {
          "t": 13,
          "x": -36,
          "y": 10,
          "scale": 1.06
        },
        {
          "t": 18,
          "x": -36,
          "y": 10,
          "scale": 1.06
        }
      ],
      "actorKeys": {
        "boy": [
          {
            "t": 8,
            "x": 1100,
            "y": 480,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-idle"
          },
          {
            "t": 16,
            "x": 1100,
            "y": 480,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-alert"
          },
          {
            "t": 18,
            "x": 1100,
            "y": 480,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-alert"
          }
        ],
        "wolf": [],
        "villagers": [],
        "sheep": [
          {
            "t": 8,
            "x": 1240,
            "y": 560,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-graze"
          },
          {
            "t": 10.8,
            "x": 1240,
            "y": 560,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-listen"
          },
          {
            "t": 18,
            "x": 1240,
            "y": 560,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-graze"
          }
        ]
      },
      "effectIds": [
        "village-houses",
        "cloud-shadow-sweep",
        "sheep-eleven"
      ],
      "cast": {
        "sheep": 11,
        "villagers": [],
        "boy": true,
        "wolf": false,
        "spread": 1
      }
    },
    {
      "id": "s03",
      "index": 3,
      "title": "错认",
      "start": 18,
      "end": 28,
      "section": "第一次谎言",
      "palette": "day",
      "transition": {
        "type": "cut",
        "start": 27.6,
        "duration": 0.4
      },
      "captionCues": [
        {
          "start": 24.7,
          "end": 27.8,
          "text": "那不过是树影。少年却起了玩笑的念头。"
        }
      ],
      "camera": [
        {
          "t": 18,
          "x": 0,
          "y": 0,
          "scale": 1.02
        },
        {
          "t": 22,
          "x": -65,
          "y": 0,
          "scale": 1.11
        },
        {
          "t": 25,
          "x": -65,
          "y": 0,
          "scale": 1.11
        },
        {
          "t": 28,
          "x": -8,
          "y": 0,
          "scale": 1
        }
      ],
      "actorKeys": {
        "boy": [
          {
            "t": 18,
            "x": 1150,
            "y": 520,
            "scale": 1.62,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-idle"
          },
          {
            "t": 22,
            "x": 1150,
            "y": 520,
            "scale": 1.62,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-alert"
          },
          {
            "t": 28,
            "x": 1150,
            "y": 520,
            "scale": 1.62,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-alert"
          }
        ],
        "wolf": [],
        "villagers": [],
        "sheep": [
          {
            "t": 18,
            "x": 780,
            "y": 600,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-listen"
          },
          {
            "t": 28,
            "x": 1000,
            "y": 600,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-listen"
          }
        ]
      },
      "effectIds": [
        "branch-shadow",
        "reveal-branch",
        "no-wolf-here"
      ],
      "cast": {
        "sheep": 6,
        "villagers": [],
        "boy": true,
        "wolf": false,
        "spread": 0.72
      }
    },
    {
      "id": "s04",
      "index": 4,
      "title": "第一声",
      "start": 28,
      "end": 38,
      "section": "第一次谎言",
      "palette": "day",
      "transition": {
        "type": "crossfade",
        "start": 37.6,
        "duration": 0.4
      },
      "captionCues": [
        {
          "start": 29,
          "end": 35.2,
          "text": "狼来了！狼来了！"
        }
      ],
      "camera": [
        {
          "t": 28,
          "x": 0,
          "y": 0,
          "scale": 1.14
        },
        {
          "t": 31,
          "x": -28,
          "y": 0,
          "scale": 1.21
        },
        {
          "t": 38,
          "x": -28,
          "y": 0,
          "scale": 1.21
        }
      ],
      "actorKeys": {
        "boy": [
          {
            "t": 28,
            "x": 930,
            "y": 500,
            "scale": 1.95,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-idle"
          },
          {
            "t": 29,
            "x": 930,
            "y": 500,
            "scale": 1.95,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-shout"
          },
          {
            "t": 33,
            "x": 930,
            "y": 500,
            "scale": 1.95,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-shout"
          },
          {
            "t": 36,
            "x": 930,
            "y": 500,
            "scale": 1.95,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-laugh"
          },
          {
            "t": 38,
            "x": 930,
            "y": 500,
            "scale": 1.95,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-laugh"
          }
        ],
        "wolf": [],
        "villagers": [],
        "sheep": [
          {
            "t": 28,
            "x": 1270,
            "y": 600,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-listen"
          },
          {
            "t": 38,
            "x": 1180,
            "y": 600,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-listen"
          }
        ]
      },
      "effectIds": [
        "echo-waves-3",
        "village-compressed",
        "first-call"
      ],
      "cast": {
        "sheep": 8,
        "villagers": [],
        "boy": true,
        "wolf": false,
        "spread": 0.78
      }
    },
    {
      "id": "s05",
      "index": 5,
      "title": "援救",
      "start": 38,
      "end": 50,
      "section": "第一次谎言",
      "palette": "day",
      "transition": {
        "type": "cut",
        "start": 49.6,
        "duration": 0.4
      },
      "captionCues": [
        {
          "start": 39.5,
          "end": 47.8,
          "text": "村民放下手里的活，急忙奔上山。"
        }
      ],
      "camera": [
        {
          "t": 38,
          "x": 0,
          "y": 0,
          "scale": 1
        },
        {
          "t": 46,
          "x": 95,
          "y": 0,
          "scale": 1.08
        },
        {
          "t": 50,
          "x": 95,
          "y": 0,
          "scale": 1.08
        }
      ],
      "actorKeys": {
        "boy": [
          {
            "t": 38,
            "x": 1290,
            "y": 430,
            "scale": 0.85,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-idle"
          },
          {
            "t": 50,
            "x": 1290,
            "y": 430,
            "scale": 0.85,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-idle"
          }
        ],
        "wolf": [],
        "villagers": [
          {
            "t": 38,
            "x": 190,
            "y": 760,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-stride"
          },
          {
            "t": 43.5,
            "x": 520,
            "y": 660,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-stride"
          },
          {
            "t": 47,
            "x": 760,
            "y": 570,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-panting"
          },
          {
            "t": 49.5,
            "x": 800,
            "y": 545,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-look-up"
          },
          {
            "t": 50,
            "x": 800,
            "y": 545,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-look-up"
          }
        ],
        "sheep": [
          {
            "t": 38,
            "x": 1180,
            "y": 520,
            "scale": 0.8,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-graze"
          },
          {
            "t": 50,
            "x": 1150,
            "y": 520,
            "scale": 0.8,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-graze"
          }
        ]
      },
      "effectIds": [
        "slope-path",
        "villagers-climb"
      ],
      "cast": {
        "sheep": 6,
        "villagers": [
          "woman",
          "youth",
          "elder"
        ],
        "boy": true,
        "wolf": false,
        "spread": 0.66
      }
    },
    {
      "id": "s06",
      "index": 6,
      "title": "空坡上的笑",
      "start": 50,
      "end": 60,
      "section": "第一次谎言",
      "palette": "day",
      "transition": {
        "type": "crossfade",
        "start": 59.4,
        "duration": 0.6
      },
      "captionCues": [
        {
          "start": 52,
          "end": 59,
          "text": "「骗你们的！」少年哈哈大笑。村民第一次失望了。"
        }
      ],
      "camera": [
        {
          "t": 50,
          "x": 0,
          "y": 0,
          "scale": 1
        },
        {
          "t": 56,
          "x": 0,
          "y": 0,
          "scale": 1
        },
        {
          "t": 60,
          "x": -26,
          "y": -8,
          "scale": 1.07
        }
      ],
      "actorKeys": {
        "boy": [
          {
            "t": 50,
            "x": 1120,
            "y": 560,
            "scale": 1.32,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-idle"
          },
          {
            "t": 53,
            "x": 1120,
            "y": 560,
            "scale": 1.32,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-laugh"
          },
          {
            "t": 55.1,
            "x": 1120,
            "y": 560,
            "scale": 1.32,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-laugh"
          },
          {
            "t": 60,
            "x": 1120,
            "y": 560,
            "scale": 1.32,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-idle"
          }
        ],
        "wolf": [],
        "villagers": [
          {
            "t": 50,
            "x": 420,
            "y": 590,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-look-up"
          },
          {
            "t": 56.8,
            "x": 420,
            "y": 590,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-arms-crossed"
          },
          {
            "t": 60,
            "x": 420,
            "y": 590,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-arms-crossed"
          }
        ],
        "sheep": [
          {
            "t": 50,
            "x": 900,
            "y": 620,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-graze"
          },
          {
            "t": 53.4,
            "x": 900,
            "y": 620,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-listen"
          },
          {
            "t": 60,
            "x": 900,
            "y": 620,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-graze"
          }
        ]
      },
      "effectIds": [
        "empty-slope",
        "single-bell-closeup",
        "disappointed-villagers"
      ],
      "cast": {
        "sheep": 5,
        "villagers": [
          "elder",
          "woman",
          "youth"
        ],
        "boy": true,
        "wolf": false,
        "spread": 0.62
      }
    },
    {
      "id": "s07",
      "index": 7,
      "title": "第二个黄昏",
      "start": 60,
      "end": 68,
      "section": "第二次谎言",
      "palette": "dusk",
      "transition": {
        "type": "cut",
        "start": 67.7,
        "duration": 0.3
      },
      "captionCues": [
        {
          "start": 61.4,
          "end": 66.4,
          "text": "过了一阵，他又想试试大家。"
        }
      ],
      "camera": [
        {
          "t": 60,
          "x": 0,
          "y": 0,
          "scale": 1
        },
        {
          "t": 68,
          "x": -24,
          "y": 0,
          "scale": 1.03
        }
      ],
      "actorKeys": {
        "boy": [
          {
            "t": 60,
            "x": 1060,
            "y": 570,
            "scale": 1.22,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-idle"
          },
          {
            "t": 65,
            "x": 1060,
            "y": 570,
            "scale": 1.22,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-alert"
          },
          {
            "t": 67.4,
            "x": 1060,
            "y": 570,
            "scale": 1.22,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-shout"
          },
          {
            "t": 68,
            "x": 1060,
            "y": 570,
            "scale": 1.22,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-shout"
          }
        ],
        "wolf": [],
        "villagers": [],
        "sheep": [
          {
            "t": 60,
            "x": 1300,
            "y": 600,
            "scale": 0.9,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-graze"
          },
          {
            "t": 68,
            "x": 1300,
            "y": 600,
            "scale": 0.9,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-graze"
          }
        ]
      },
      "effectIds": [
        "stump-sit",
        "paper-birds",
        "window-lights"
      ],
      "cast": {
        "sheep": 6,
        "villagers": [],
        "boy": true,
        "wolf": false,
        "spread": 0.6
      }
    },
    {
      "id": "s08",
      "index": 8,
      "title": "第二声",
      "start": 68,
      "end": 78,
      "section": "第二次谎言",
      "palette": "dusk",
      "transition": {
        "type": "cut",
        "start": 77.6,
        "duration": 0.4
      },
      "captionCues": [
        {
          "start": 69.2,
          "end": 75,
          "text": "狼来了！狼来了！"
        }
      ],
      "camera": [
        {
          "t": 68,
          "x": 0,
          "y": 0,
          "scale": 1.1
        },
        {
          "t": 71,
          "x": -18,
          "y": 0,
          "scale": 1.22
        },
        {
          "t": 78,
          "x": -18,
          "y": 0,
          "scale": 1.22
        }
      ],
      "actorKeys": {
        "boy": [
          {
            "t": 68,
            "x": 1100,
            "y": 470,
            "scale": 1.52,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-shout"
          },
          {
            "t": 69.4,
            "x": 1100,
            "y": 470,
            "scale": 1.52,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-shout"
          },
          {
            "t": 73.2,
            "x": 1100,
            "y": 470,
            "scale": 1.52,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-shout"
          },
          {
            "t": 75,
            "x": 1100,
            "y": 470,
            "scale": 1.52,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-idle"
          },
          {
            "t": 78,
            "x": 1100,
            "y": 470,
            "scale": 1.52,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-idle"
          }
        ],
        "wolf": [],
        "villagers": [],
        "sheep": [
          {
            "t": 68,
            "x": 830,
            "y": 610,
            "scale": 0.9,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-listen"
          },
          {
            "t": 78,
            "x": 880,
            "y": 610,
            "scale": 0.9,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-listen"
          }
        ]
      },
      "effectIds": [
        "echo-shards",
        "no-response-gap",
        "second-call"
      ],
      "cast": {
        "sheep": 5,
        "villagers": [],
        "boy": true,
        "wolf": false,
        "spread": 0.66
      }
    },
    {
      "id": "s09",
      "index": 9,
      "title": "再次白跑",
      "start": 78,
      "end": 90,
      "section": "第二次谎言",
      "palette": "dusk",
      "transition": {
        "type": "crossfade",
        "start": 89.5,
        "duration": 0.5
      },
      "captionCues": [
        {
          "start": 79.4,
          "end": 88.6,
          "text": "他们还是来了，却只看见空空的山坡。"
        }
      ],
      "camera": [
        {
          "t": 78,
          "x": 0,
          "y": 0,
          "scale": 1.02
        },
        {
          "t": 84,
          "x": 45,
          "y": 0,
          "scale": 1.08
        },
        {
          "t": 90,
          "x": 45,
          "y": 0,
          "scale": 1.08
        }
      ],
      "actorKeys": {
        "boy": [
          {
            "t": 78,
            "x": 1350,
            "y": 430,
            "scale": 0.8,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-idle"
          },
          {
            "t": 90,
            "x": 1350,
            "y": 430,
            "scale": 0.8,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-idle"
          }
        ],
        "wolf": [],
        "villagers": [
          {
            "t": 78,
            "x": 260,
            "y": 740,
            "scale": 0.95,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-stride-slow"
          },
          {
            "t": 80.5,
            "x": 300,
            "y": 715,
            "scale": 0.95,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-hesitate"
          },
          {
            "t": 82.8,
            "x": 360,
            "y": 680,
            "scale": 0.95,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-stride-slow"
          },
          {
            "t": 86,
            "x": 700,
            "y": 560,
            "scale": 0.95,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-stride-slow"
          },
          {
            "t": 88.5,
            "x": 820,
            "y": 520,
            "scale": 0.95,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-look-up"
          },
          {
            "t": 90,
            "x": 820,
            "y": 520,
            "scale": 0.95,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-look-up"
          }
        ],
        "sheep": [
          {
            "t": 78,
            "x": 1250,
            "y": 520,
            "scale": 0.75,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-graze"
          },
          {
            "t": 90,
            "x": 1250,
            "y": 520,
            "scale": 0.75,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-graze"
          }
        ]
      },
      "effectIds": [
        "village-gate-open",
        "lantern",
        "narrowed-frame"
      ],
      "cast": {
        "sheep": 4,
        "villagers": [
          "elder",
          "youth",
          "woman"
        ],
        "boy": true,
        "wolf": false,
        "spread": 0.72
      }
    },
    {
      "id": "s10",
      "index": 10,
      "title": "门关上了",
      "start": 90,
      "end": 101,
      "section": "第二次谎言",
      "palette": "dusk",
      "transition": {
        "type": "cut",
        "start": 100.4,
        "duration": 0.6
      },
      "captionCues": [
        {
          "start": 92,
          "end": 99.2,
          "text": "「下回别再骗人了！」第二次，信任几乎耗尽。"
        }
      ],
      "camera": [
        {
          "t": 90,
          "x": 0,
          "y": 0,
          "scale": 1
        },
        {
          "t": 96,
          "x": 14,
          "y": 0,
          "scale": 1.06
        },
        {
          "t": 101,
          "x": 14,
          "y": 0,
          "scale": 1.06
        }
      ],
      "actorKeys": {
        "boy": [
          {
            "t": 90,
            "x": 1320,
            "y": 400,
            "scale": 0.62,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-idle"
          },
          {
            "t": 99.2,
            "x": 1320,
            "y": 400,
            "scale": 0.62,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-guilt"
          },
          {
            "t": 101,
            "x": 1320,
            "y": 400,
            "scale": 0.62,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-guilt"
          }
        ],
        "wolf": [],
        "villagers": [
          {
            "t": 90,
            "x": 640,
            "y": 640,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-turn-away"
          },
          {
            "t": 93,
            "x": 700,
            "y": 650,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-shake-head"
          },
          {
            "t": 95,
            "x": 760,
            "y": 660,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-push-door"
          },
          {
            "t": 97.2,
            "x": 780,
            "y": 665,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-push-door"
          },
          {
            "t": 101,
            "x": 790,
            "y": 668,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-turn-away"
          }
        ],
        "sheep": []
      },
      "effectIds": [
        "village-door",
        "warm-light-dies",
        "distant-wolf-howl"
      ],
      "cast": {
        "sheep": 0,
        "villagers": [
          "woman",
          "youth",
          "elder"
        ],
        "boy": true,
        "wolf": false,
        "spread": 1
      }
    },
    {
      "id": "s11",
      "index": 11,
      "title": "真狼",
      "start": 101,
      "end": 112,
      "section": "真狼",
      "palette": "night",
      "transition": {
        "type": "cut",
        "start": 111.7,
        "duration": 0.3
      },
      "captionCues": [
        {
          "start": 103,
          "end": 110.6,
          "text": "这一次，真正的狼从树林里走了出来。"
        }
      ],
      "camera": [
        {
          "t": 101,
          "x": 0,
          "y": 0,
          "scale": 1
        },
        {
          "t": 106,
          "x": 0,
          "y": 0,
          "scale": 1
        },
        {
          "t": 109,
          "x": -22,
          "y": 0,
          "scale": 1.1
        },
        {
          "t": 112,
          "x": -82,
          "y": 0,
          "scale": 1.1
        }
      ],
      "actorKeys": {
        "boy": [
          {
            "t": 101,
            "x": 1300,
            "y": 520,
            "scale": 0.95,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-idle"
          },
          {
            "t": 110.3,
            "x": 1300,
            "y": 520,
            "scale": 0.95,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-alert"
          },
          {
            "t": 112,
            "x": 1300,
            "y": 520,
            "scale": 0.95,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-alert"
          }
        ],
        "wolf": [
          {
            "t": 101,
            "x": 380,
            "y": 620,
            "scale": 1,
            "rotation": 0,
            "opacity": 0.001,
            "pose": "W-crouch"
          },
          {
            "t": 103,
            "x": 380,
            "y": 620,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "W-crouch"
          },
          {
            "t": 105.5,
            "x": 400,
            "y": 626,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "W-crouch"
          },
          {
            "t": 109,
            "x": 470,
            "y": 622,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "W-advance"
          },
          {
            "t": 112,
            "x": 520,
            "y": 618,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "W-advance"
          }
        ],
        "villagers": [],
        "sheep": [
          {
            "t": 101,
            "x": 1080,
            "y": 590,
            "scale": 0.85,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-graze"
          },
          {
            "t": 107,
            "x": 1080,
            "y": 590,
            "scale": 0.85,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-listen"
          },
          {
            "t": 111.5,
            "x": 1080,
            "y": 590,
            "scale": 0.85,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-scatter"
          },
          {
            "t": 112,
            "x": 1080,
            "y": 590,
            "scale": 0.85,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-scatter"
          }
        ]
      },
      "effectIds": [
        "wolf-eyes",
        "wolf-in-thicket",
        "red-thin-cloud"
      ],
      "cast": {
        "sheep": 8,
        "villagers": [],
        "boy": true,
        "wolf": true,
        "spread": 0.74
      }
    },
    {
      "id": "s12",
      "index": 12,
      "title": "第三声",
      "start": 112,
      "end": 121,
      "section": "真狼",
      "palette": "night",
      "transition": {
        "type": "cut",
        "start": 120.7,
        "duration": 0.3
      },
      "captionCues": [
        {
          "start": 113,
          "end": 119,
          "text": "狼来了！这次是真的！救命！"
        }
      ],
      "camera": [
        {
          "t": 112,
          "x": 0,
          "y": 0,
          "scale": 1.15
        },
        {
          "t": 114,
          "x": -18,
          "y": 0,
          "scale": 1.28
        },
        {
          "t": 121,
          "x": -18,
          "y": 0,
          "scale": 1.28
        }
      ],
      "actorKeys": {
        "boy": [
          {
            "t": 112,
            "x": 1120,
            "y": 520,
            "scale": 2.15,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-freeze"
          },
          {
            "t": 113.1,
            "x": 1120,
            "y": 520,
            "scale": 2.15,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-shout"
          },
          {
            "t": 116.8,
            "x": 1120,
            "y": 520,
            "scale": 2.15,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-shout"
          },
          {
            "t": 118.7,
            "x": 1120,
            "y": 520,
            "scale": 2.15,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-freeze"
          },
          {
            "t": 119.5,
            "x": 1120,
            "y": 520,
            "scale": 2.15,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-freeze"
          },
          {
            "t": 121,
            "x": 1120,
            "y": 520,
            "scale": 2.15,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-freeze"
          }
        ],
        "wolf": [
          {
            "t": 112,
            "x": 560,
            "y": 640,
            "scale": 1.1,
            "rotation": 0,
            "opacity": 1,
            "pose": "W-advance"
          },
          {
            "t": 121,
            "x": 620,
            "y": 636,
            "scale": 1.1,
            "rotation": 0,
            "opacity": 1,
            "pose": "W-advance"
          }
        ],
        "villagers": [],
        "sheep": [
          {
            "t": 112,
            "x": 860,
            "y": 620,
            "scale": 1.1,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-scatter"
          },
          {
            "t": 121,
            "x": 940,
            "y": 614,
            "scale": 1.1,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-scatter"
          }
        ]
      },
      "effectIds": [
        "echo-broken",
        "ridge-cuts-echo",
        "silence-window"
      ],
      "cast": {
        "sheep": 8,
        "villagers": [],
        "boy": true,
        "wolf": true,
        "spread": 0.8
      }
    },
    {
      "id": "s13",
      "index": 13,
      "title": "没有人上山",
      "start": 121,
      "end": 132,
      "section": "真狼",
      "palette": "night",
      "transition": {
        "type": "cut",
        "start": 131.6,
        "duration": 0.4
      },
      "captionCues": [
        {
          "start": 123.7,
          "end": 130.6,
          "text": "村民听见了，却没有上山。他们以为又是玩笑。"
        }
      ],
      "camera": [
        {
          "t": 121,
          "x": 0,
          "y": 0,
          "scale": 1
        },
        {
          "t": 132,
          "x": 0,
          "y": 0,
          "scale": 1
        }
      ],
      "actorKeys": {
        "boy": [],
        "wolf": [],
        "villagers": [
          {
            "t": 121,
            "x": 500,
            "y": 640,
            "scale": 1.05,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-seated"
          },
          {
            "t": 124,
            "x": 500,
            "y": 640,
            "scale": 1.05,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-look-up"
          },
          {
            "t": 126,
            "x": 620,
            "y": 650,
            "scale": 1.05,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-hand-half-raised"
          },
          {
            "t": 128,
            "x": 740,
            "y": 660,
            "scale": 1.05,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-seated"
          },
          {
            "t": 132,
            "x": 740,
            "y": 660,
            "scale": 1.05,
            "rotation": 0,
            "opacity": 1,
            "pose": "V-seated"
          }
        ],
        "sheep": []
      },
      "effectIds": [
        "closed-door",
        "warm-window",
        "faint-echo-symbol"
      ],
      "cast": {
        "sheep": 0,
        "villagers": [
          "elder",
          "woman",
          "youth"
        ],
        "boy": false,
        "wolf": false,
        "spread": 1
      }
    },
    {
      "id": "s14",
      "index": 14,
      "title": "少了一只羊",
      "start": 132,
      "end": 141,
      "section": "真狼",
      "palette": "night",
      "transition": {
        "type": "crossfade",
        "start": 140.4,
        "duration": 0.6
      },
      "captionCues": [
        {
          "start": 136.5,
          "end": 140.3,
          "text": "狼叼走了一只羊。少年终于不再笑了。"
        }
      ],
      "camera": [
        {
          "t": 132,
          "x": 0,
          "y": 0,
          "scale": 1.08
        },
        {
          "t": 134,
          "x": 0,
          "y": 0,
          "scale": 1.08
        },
        {
          "t": 136,
          "x": -80,
          "y": 0,
          "scale": 1.08
        },
        {
          "t": 141,
          "x": -80,
          "y": 0,
          "scale": 1.08
        }
      ],
      "actorKeys": {
        "boy": [
          {
            "t": 132,
            "x": 1200,
            "y": 560,
            "scale": 1.15,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-freeze"
          },
          {
            "t": 138,
            "x": 1200,
            "y": 600,
            "scale": 1.15,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-sad"
          },
          {
            "t": 141,
            "x": 1200,
            "y": 600,
            "scale": 1.15,
            "rotation": 0,
            "opacity": 1,
            "pose": "B-sad"
          }
        ],
        "wolf": [
          {
            "t": 132,
            "x": 700,
            "y": 600,
            "scale": 1.05,
            "rotation": 0,
            "opacity": 1,
            "pose": "W-lunge"
          },
          {
            "t": 133.4,
            "x": 820,
            "y": 596,
            "scale": 1.05,
            "rotation": 0,
            "opacity": 1,
            "pose": "W-lunge"
          },
          {
            "t": 134.2,
            "x": 920,
            "y": 594,
            "scale": 1.05,
            "rotation": 0,
            "opacity": 1,
            "pose": "W-depart"
          },
          {
            "t": 135.5,
            "x": 1720,
            "y": 590,
            "scale": 1.05,
            "rotation": 0,
            "opacity": 1,
            "pose": "W-depart"
          },
          {
            "t": 136,
            "x": 1720,
            "y": 590,
            "scale": 1.05,
            "rotation": 0,
            "opacity": 1,
            "pose": "W-depart"
          },
          {
            "t": 141,
            "x": 1720,
            "y": 590,
            "scale": 1.05,
            "rotation": 0,
            "opacity": 0,
            "pose": "W-depart"
          }
        ],
        "villagers": [],
        "sheep": [
          {
            "t": 132,
            "x": 1000,
            "y": 600,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-scatter"
          },
          {
            "t": 133.4,
            "x": 960,
            "y": 606,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-scatter"
          },
          {
            "t": 135.5,
            "x": 880,
            "y": 612,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-scatter"
          },
          {
            "t": 141,
            "x": 860,
            "y": 612,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "pose": "S-graze"
          }
        ]
      },
      "effectIds": [
        "lost-lamb",
        "fallen-staff",
        "single-bell",
        "empty-grass"
      ],
      "cast": {
        "sheep": 6,
        "villagers": [],
        "boy": true,
        "wolf": true,
        "spread": 0.78
      }
    },
    {
      "id": "s15",
      "index": 15,
      "title": "回声的代价",
      "start": 141,
      "end": 150,
      "section": "尾声",
      "palette": "paper",
      "transition": {
        "type": "cut",
        "start": 141,
        "duration": 0
      },
      "captionCues": [
        {
          "start": 143,
          "end": 150,
          "text": "谎言会耗尽信任。当真话终于响起，也可能无人回应。",
          "hideOverlay": true
        }
      ],
      "camera": [
        {
          "t": 141,
          "x": 0,
          "y": 0,
          "scale": 1
        },
        {
          "t": 150,
          "x": 0,
          "y": 0,
          "scale": 1
        }
      ],
      "actorKeys": {
        "boy": [],
        "wolf": [],
        "villagers": [],
        "sheep": []
      },
      "effectIds": [
        "end-card",
        "bell-and-arcs",
        "signature"
      ],
      "cast": {
        "sheep": 0,
        "villagers": [],
        "boy": false,
        "wolf": false,
        "spread": 1
      }
    }
  ],
  "soundEvents": [
    {
      "id": "wind-bed",
      "at": 0,
      "type": "wind",
      "dur": 150,
      "gain": -28,
      "level": -28,
      "fade": 0.6
    },
    {
      "id": "wind-rise-1",
      "at": 6.8,
      "type": "wind",
      "dur": 143.2,
      "gain": -24,
      "level": -24,
      "fade": 1.2
    },
    {
      "id": "wind-fall-2",
      "at": 18,
      "type": "wind",
      "dur": 132,
      "gain": -31,
      "level": -31,
      "fade": 1
    },
    {
      "id": "bell-first",
      "at": 0.75,
      "type": "bell",
      "dur": 0.9,
      "gain": -13
    },
    {
      "id": "theme-open",
      "at": 1.5,
      "type": "theme",
      "dur": 1.2,
      "gain": -19
    },
    {
      "id": "bell-8.2-a",
      "at": 8.2,
      "type": "bell",
      "dur": 0.9,
      "gain": -16
    },
    {
      "id": "bell-8.2-b",
      "at": 8.31,
      "type": "bell",
      "dur": 0.9,
      "gain": -18
    },
    {
      "id": "bell-8.2-c",
      "at": 8.42,
      "type": "bell",
      "dur": 0.9,
      "gain": -20
    },
    {
      "id": "bird-10.5",
      "at": 10.5,
      "type": "bird",
      "dur": 0.7,
      "gain": -26
    },
    {
      "id": "chord-warm-15",
      "at": 15,
      "type": "chord",
      "dur": 2.6,
      "gain": -22,
      "chord": "Dm"
    },
    {
      "id": "thin-17.5",
      "at": 17.5,
      "type": "thin",
      "dur": 40,
      "gain": -6
    },
    {
      "id": "string-pulse-21.2",
      "at": 21.2,
      "type": "string",
      "dur": 1.6,
      "gain": -25
    },
    {
      "id": "branch-rub-24.5",
      "at": 24.5,
      "type": "grass",
      "dur": 0.6,
      "gain": -22
    },
    {
      "id": "inhale-27.7",
      "at": 27.7,
      "type": "inhale",
      "dur": 0.45,
      "gain": -24
    },
    {
      "id": "call-1",
      "at": 29.1,
      "type": "horn",
      "dur": 0.85,
      "gain": -9,
      "variant": "first"
    },
    {
      "id": "woodblock-1",
      "at": 29.16,
      "type": "woodblock",
      "dur": 0.5,
      "gain": -21
    },
    {
      "id": "call-1b",
      "at": 33,
      "type": "horn",
      "dur": 0.85,
      "gain": -9,
      "variant": "first"
    },
    {
      "id": "woodblock-2",
      "at": 33.06,
      "type": "woodblock",
      "dur": 0.5,
      "gain": -21
    },
    {
      "id": "footsteps-38.4",
      "at": 38.4,
      "type": "footsteps",
      "dur": 8.4,
      "gain": -22,
      "rate": 2.2
    },
    {
      "id": "basket-41.0",
      "at": 41,
      "type": "woodblock",
      "dur": 0.4,
      "gain": -23
    },
    {
      "id": "panting-46.5",
      "at": 46.5,
      "type": "breath",
      "dur": 1.4,
      "gain": -21
    },
    {
      "id": "rest-49.7",
      "at": 49.7,
      "type": "rest",
      "dur": 0.75,
      "gain": -60
    },
    {
      "id": "laugh-53.1",
      "at": 53.1,
      "type": "laugh",
      "dur": 0.45,
      "gain": -20
    },
    {
      "id": "laugh-55.0",
      "at": 55,
      "type": "laugh",
      "dur": 0.45,
      "gain": -20
    },
    {
      "id": "theme-drop-58.5",
      "at": 58.5,
      "type": "theme",
      "dur": 1,
      "gain": -21,
      "semitone": -1
    },
    {
      "id": "bell-octave-60",
      "at": 60,
      "type": "theme",
      "dur": 1.2,
      "gain": -23,
      "octave": -1
    },
    {
      "id": "bass-63",
      "at": 63,
      "type": "bass",
      "dur": 2.3,
      "gain": -23
    },
    {
      "id": "inhale-67.7",
      "at": 67.7,
      "type": "inhale",
      "dur": 0.45,
      "gain": -24
    },
    {
      "id": "call-2",
      "at": 69.4,
      "type": "horn",
      "dur": 0.9,
      "gain": -10,
      "variant": "second"
    },
    {
      "id": "call-2b",
      "at": 73.2,
      "type": "horn",
      "dur": 0.9,
      "gain": -10,
      "variant": "second"
    },
    {
      "id": "tail-cut-75",
      "at": 75,
      "type": "rest",
      "dur": 0.75,
      "gain": -60
    },
    {
      "id": "steps-slow-78.4",
      "at": 78.4,
      "type": "footsteps",
      "dur": 8.6,
      "gain": -24,
      "rate": 1.6
    },
    {
      "id": "lantern-82",
      "at": 82,
      "type": "woodblock",
      "dur": 0.35,
      "gain": -24
    },
    {
      "id": "stutter-88.5",
      "at": 88.5,
      "type": "string",
      "dur": 1.1,
      "gain": -25
    },
    {
      "id": "wind-89.6",
      "at": 89.6,
      "type": "wind",
      "dur": 60,
      "gain": -26,
      "level": -26,
      "fade": 1.5
    },
    {
      "id": "door-95",
      "at": 95,
      "type": "knock",
      "dur": 0.7,
      "gain": -20
    },
    {
      "id": "latch-97.2",
      "at": 97.2,
      "type": "knock",
      "dur": 0.4,
      "gain": -22
    },
    {
      "id": "wolf-far-100.5",
      "at": 100.5,
      "type": "wolf",
      "dur": 1.4,
      "gain": -30,
      "low": true
    },
    {
      "id": "branch-crack-106",
      "at": 106,
      "type": "grass",
      "dur": 0.5,
      "gain": -18
    },
    {
      "id": "bell-loud-108.4",
      "at": 108.4,
      "type": "bell",
      "dur": 0.9,
      "gain": -12
    },
    {
      "id": "wolf-howl-111.3",
      "at": 111.3,
      "type": "wolf",
      "dur": 1.9,
      "gain": -14
    },
    {
      "id": "call-3",
      "at": 113.1,
      "type": "horn",
      "dur": 0.9,
      "gain": -8,
      "variant": "third"
    },
    {
      "id": "call-3b",
      "at": 116.8,
      "type": "horn",
      "dur": 0.9,
      "gain": -9,
      "variant": "third"
    },
    {
      "id": "silence-119.5",
      "at": 119.5,
      "type": "silence",
      "dur": 4,
      "gain": 0
    },
    {
      "id": "wind-123.5",
      "at": 123.5,
      "type": "wind",
      "dur": 26.5,
      "gain": -38,
      "level": -38,
      "fade": 1
    },
    {
      "id": "sleeve-126.3",
      "at": 126.3,
      "type": "grass",
      "dur": 0.32,
      "gain": -30
    },
    {
      "id": "bell-muted-129.5",
      "at": 129.5,
      "type": "bell",
      "dur": 1.4,
      "gain": -32,
      "muted": true
    },
    {
      "id": "grass-loud-132.2",
      "at": 132.2,
      "type": "grass",
      "dur": 0.7,
      "gain": -17
    },
    {
      "id": "wolf-howl-133.6",
      "at": 133.6,
      "type": "wolf",
      "dur": 1.9,
      "gain": -12
    },
    {
      "id": "hoof-135",
      "at": 135,
      "type": "footsteps",
      "dur": 1.6,
      "gain": -18,
      "rate": 4
    },
    {
      "id": "bell-alone-137.1",
      "at": 137.1,
      "type": "bell",
      "dur": 1.2,
      "gain": -16
    },
    {
      "id": "music-out-138",
      "at": 138,
      "type": "music-out",
      "dur": 12,
      "gain": 0
    },
    {
      "id": "theme-final-141",
      "at": 141,
      "type": "theme",
      "dur": 3,
      "gain": -21,
      "decay": true
    }
  ]
};
});
