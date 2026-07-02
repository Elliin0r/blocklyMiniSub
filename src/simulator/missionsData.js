export const MISSIONS = {
    1: {
        name: "Open Ocean",
        description: "No obstacles",
        goalX: 1500,
        obstacles: [], things: [], buoy: [], plants: []
    },
    2: {
        name: "The Coral Maze",
        description: "Navigate up and down through the obstacles.",
        goalX: 2500,
        obstacles: [
            { x: 220, depthPct: 0.6, w: 40, h: 40 },  
            { x: 460, depthPct: 0.4, w: 40, h: 40 },  
            { x: 820, depthPct: 0.3, w: 70, h: 30, type: "shark" },  
            { x: 1400, depthPct: 0.5, w: 40, h: 40 },
            { x: 2000, depthPct: 0.4, w: 70, h: 30, type: "shark" },
            { x: 2300, depthPct: 0.55, w: 40, h: 40 }  
        ],
        things: [
            { x: 340, y: 60, w: 3, h: 100 }, 
            { x: 1200, y: 60, w: 3, h: 70 }, 
            { x: 1800, y: 60, w: 3, h: 160 },
            { x: 2400, y: 60, w: 3, h: 70 }
        ],
        buoy: [
            { x: 335, y: 30, w: 15, h: 30 }, 
            { x: 1195, y: 30, w: 15, h: 30 }, 
            { x: 1795, y: 30, w: 15, h: 30 },
            { x: 2395, y: 30, w: 15, h: 30 }
        ],
        plants: [
            { x: 660, w: 5, h: 80 },
            { x: 680, w: 5, h: 100 },
            { x: 700, w: 5, h: 80 },
            { x: 720, w: 5, h: 100 },
            { x: 1000, w: 5, h: 100 },
            { x: 1020, w: 5, h: 120 },
            { x: 1040, w: 5, h: 100 },
            { x: 1600, w: 5, h: 80 },
            { x: 1620, w: 5, h: 100 },
            { x: 1640, w: 5, h: 80 },
            { x: 2120, w: 5, h: 80 },
            { x: 2140, w: 5, h: 100 },
            { x: 2160, w: 5, h: 80 }
        ]
    },
    3: {
        name: "The Deep Cave",
        description: "Navigate through the cave",
        goalX: 2000,
            obstacles: [
            
            { x: 120, depthPct: 0.1, w: 300, h: 125 }, 
            { x: 120, depthPct: 0.9, w: 300, h: 125 }, 
           
            { x: 400, depthPct: 0.1, w: 600, h: 80 }, 
            { x: 400, depthPct: 0.9, w: 440, h: 80 }, 
           
            { x: 900, depthPct: 0.1, w: 600, h: 175 }, 
            
            { x: 1000, depthPct: 0.7, w: 180, h: 100 }, 
            { x: 1300, depthPct: 1.0, w: 300, h: 40 }, 
            { x: 1400, depthPct: 0.1, w: 700, h: 80 }, 
            { x: 1600, depthPct: 0.9, w: 300, h: 160 },
            { x: 1700, depthPct: 0.9, w: 400, h: 100 },

            { x: 2050, depthPct: 0.9, w: 1000, h: 303 }
            
            ],
        things: [], buoy: [], plants: []
    },

    4: {
    name: "The coral maze",
    description: "Watch out for the sharks!",
    goalX: 2500,
    obstacles: [
      { x: 400, depthPct: 0.7, w: 40, h: 40 }, 
      
      { x: 900, depthPct: 0.4, w: 70, h: 30, type: "shark" } 
    ],
    things: [], buoy: [], plants: []
  }
    
}