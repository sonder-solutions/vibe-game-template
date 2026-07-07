use std::env;
use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};
use serde_json;

fn decrypt(hex_data: &str) -> String {
    let key = vec![
        0x42, 0x65, 0x63, 0x72, 0x65, 0x74, 0x4b, 0x65, 0x79,
        0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0
    ];

    let bytes: Vec<u8> = (0..hex_data.len())
        .step_by(2)
        .filter_map(|i| u8::from_str_radix(&hex_data[i..i+2], 16).ok())
        .collect();

    let decrypted: Vec<u8> = bytes.iter()
        .enumerate()
        .map(|(i, b)| b ^ key[i % key.len()])
        .collect();

    String::from_utf8(decrypted).unwrap_or_default()
}

#[derive(Debug, Deserialize, Serialize)]
struct ScoreEntry {
    score: i64,
    time: i64,
    name: String,
    #[serde(default)]
    uuid: Option<String>,
}

#[derive(Debug, Serialize)]
struct LeaderboardEntry {
    rank: usize,
    name: String,
    score: i64,
    time: i64,
    date: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    uuid: Option<String>,
}

fn parse_leaderboard(content: &str) -> Vec<LeaderboardEntry> {
    let mut entries = Vec::new();

    for line in content.lines() {
        if line.starts_with('|') && !line.contains("Rank") && !line.contains("---") {
            let parts: Vec<&str> = line.split('|')
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .collect();

            if parts.len() >= 5 {
                if let (Ok(score), Ok(time)) = (parts[2].parse::<i64>(), parts[3].parse::<i64>()) {
                    entries.push(LeaderboardEntry {
                        rank: parts[0].parse::<usize>().unwrap_or(0),
                        name: parts[1].to_string(),
                        score,
                        time,
                        date: parts[4].to_string(),
                    });
                }
            }
        }
    }

    entries
}

fn update_leaderboard(entries: &mut Vec<LeaderboardEntry>, new_entry: ScoreEntry) {
    // Get current date
    let date = chrono::Utc::now().format("%Y-%m-%d %H:%M").to_string();

    // Add new entry
    entries.push(LeaderboardEntry {
        rank: 0,
        name: new_entry.name,
        score: new_entry.score,
        time: new_entry.time,
        date,
        uuid: new_entry.uuid,
    });

    // Sort by score (descending)
    entries.sort_by(|a, b| b.score.cmp(&a.score));

    // Keep top 10
    entries.truncate(10);

    // Update ranks
    for (i, entry) in entries.iter_mut().enumerate() {
        entry.rank = i + 1;
    }
}

fn format_leaderboard(entries: &[LeaderboardEntry]) -> String {
    let mut output = String::new();
    output.push_str("# Leaderboard\n\n");
    output.push_str("| Rank | Name | Score | Time | Date |\n");
    output.push_str("|------|------|-------|------|------|\n");

    for entry in entries {
        output.push_str(&format!(
            "| {} | {} | {} | {} | {} |\n",
            entry.rank, entry.name, entry.score, entry.time, entry.date
        ));
    }

    output
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: {} <encrypted_payload>", args[0]);
        std::process::exit(1);
    }

    let encrypted = &args[1];
    let decrypted = decrypt(encrypted);

    // Parse JSON payload
    let submission: ScoreEntry = match serde_json::from_str(&decrypted) {
        Ok(entry) => entry,
        Err(e) => {
            eprintln!("Failed to parse submission: {}", e);
            std::process::exit(1);
        }
    };

    // Validate submission
    if submission.score < 0 {
        eprintln!("Invalid score: {}", submission.score);
        std::process::exit(1);
    }

    if submission.time < 0 {
        eprintln!("Invalid time: {}", submission.time);
        std::process::exit(1);
    }

    if submission.name.is_empty() || submission.name.len() > 50 {
        eprintln!("Invalid name: {}", submission.name);
        std::process::exit(1);
    }

    println!("Valid submission: {:?}", submission);

    // Read existing leaderboard
    let leaderboard_path = "LEADERBOARD.md";
    let content = if Path::new(leaderboard_path).exists() {
        fs::read_to_string(leaderboard_path).unwrap_or_default()
    } else {
        String::new()
    };

    let mut entries = parse_leaderboard(&content);

    // Update leaderboard
    update_leaderboard(&mut entries, submission);

    // Write back to file
    let new_content = format_leaderboard(&entries);
    fs::write(leaderboard_path, new_content).expect("Failed to write leaderboard");

    println!("Leaderboard updated successfully");
}
