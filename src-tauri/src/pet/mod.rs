use serde::{Deserialize, Serialize};

use crate::db::connection::Database;
use crate::db::queries;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PetState {
    pub name: String,
    pub species: String,    // "slime", "dragon", "wizard"
    pub hp: i32,            // 0-100
    pub max_hp: i32,
    pub xp: i32,
    pub level: i32,         // 1-3
    pub mood: String,       // "happy", "idle", "angry", "sleeping"
    pub focus_streak: i32,  // consecutive focus sessions completed
    pub total_focus_mins: i32,
    pub last_fed: i64,      // timestamp ms
}

impl Default for PetState {
    fn default() -> Self {
        Self {
            name: "Glow".to_string(),
            species: "slime".to_string(),
            hp: 80,
            max_hp: 100,
            xp: 0,
            level: 1,
            mood: "idle".to_string(),
            focus_streak: 0,
            total_focus_mins: 0,
            last_fed: 0,
        }
    }
}

impl PetState {
    /// XP required for next level
    pub fn xp_to_next_level(&self) -> i32 {
        match self.level {
            1 => 100,   // Slime → Dragon
            2 => 300,   // Dragon → Wizard
            _ => 999,
        }
    }

    /// Feed the pet (after completing a focus session)
    pub fn feed(&mut self, focus_mins: i32) {
        let heal = (focus_mins as f32 * 1.5) as i32;
        self.hp = (self.hp + heal).min(self.max_hp);
        self.xp += focus_mins * 2;
        self.total_focus_mins += focus_mins;
        self.focus_streak += 1;
        self.last_fed = crate::reporting::now_ms_util();

        // Check level up
        if self.xp >= self.xp_to_next_level() && self.level < 3 {
            self.xp -= self.xp_to_next_level();
            self.level += 1;
            self.max_hp += 20;
            self.hp = self.max_hp;
            self.species = match self.level {
                2 => "dragon".to_string(),
                3 => "wizard".to_string(),
                _ => self.species.clone(),
            };
        }

        self.update_mood();
    }

    /// Damage the pet (distraction detected)
    pub fn take_damage(&mut self, amount: i32) {
        self.hp = (self.hp - amount).max(0);
        if self.hp == 0 {
            self.focus_streak = 0;
        }
        self.update_mood();
    }

    /// Passive HP decay (called periodically)
    pub fn tick(&mut self) {
        if self.hp > 0 {
            self.hp = (self.hp - 1).max(0);
        }
        self.update_mood();
    }

    fn update_mood(&mut self) {
        self.mood = if self.hp <= 0 {
            "sleeping".to_string()
        } else if self.hp < 30 {
            "angry".to_string()
        } else if self.hp >= 70 {
            "happy".to_string()
        } else {
            "idle".to_string()
        };
    }
}

pub fn load_pet(db: &Database) -> PetState {
    let conn = match db.conn.lock() {
        Ok(c) => c,
        Err(_) => return PetState::default(),
    };

    match queries::get_metadata(&conn, "pet_state") {
        Ok(Some(json)) => serde_json::from_str(&json).unwrap_or_default(),
        _ => PetState::default(),
    }
}

pub fn save_pet(db: &Database, pet: &PetState) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let json = serde_json::to_string(pet).map_err(|e| e.to_string())?;
    queries::set_metadata(&conn, "pet_state", &json).map_err(|e| e.to_string())
}
