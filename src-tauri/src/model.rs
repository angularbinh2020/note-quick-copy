use serde::{Deserialize, Serialize};
use std::collections::HashSet;

pub const SCHEMA_VERSION: u32 = 1;
pub const APP_NAME: &str = "note-quick-copy";
pub const UNCATEGORIZED: &str = "Chưa phân loại";

fn default_schema_version() -> u32 {
    SCHEMA_VERSION
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct NotesData {
    #[serde(default = "default_schema_version")]
    pub schema_version: u32,
    pub updated_at: String,
    pub groups: Vec<Group>,
    pub items: Vec<Item>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Group {
    pub id: String,
    pub name: String,
    pub collapsed: bool,
    pub order: i64,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Item {
    pub id: String,
    pub group_id: String,
    pub content: String,
    pub order: i64,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportFile {
    pub app: String,
    pub schema_version: u32,
    pub exported_at: String,
    pub groups: Vec<Group>,
    pub items: Vec<Item>,
    pub trashed_groups: Vec<Group>,
    pub trashed_items: Vec<Item>,
}

pub fn to_export(data: &NotesData, exported_at: String) -> ExportFile {
    let (trashed_groups, groups): (Vec<Group>, Vec<Group>) = data
        .groups
        .iter()
        .cloned()
        .partition(|g| g.deleted_at.is_some());
    let (trashed_items, items): (Vec<Item>, Vec<Item>) = data
        .items
        .iter()
        .cloned()
        .partition(|i| i.deleted_at.is_some());
    ExportFile {
        app: APP_NAME.to_string(),
        schema_version: SCHEMA_VERSION,
        exported_at,
        groups,
        items,
        trashed_groups,
        trashed_items,
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportFile {
    pub app: String,
    pub schema_version: u32,
    #[serde(default)]
    pub groups: Vec<Group>,
    #[serde(default)]
    pub items: Vec<Item>,
    #[serde(default)]
    pub trashed_groups: Vec<Group>,
    #[serde(default)]
    pub trashed_items: Vec<Item>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportSummary {
    pub mode: String,
    pub groups_added: usize,
    pub items_added: usize,
    pub groups_kept: usize,
    pub items_kept: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub summary: ImportSummary,
    pub data: NotesData,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PurgeResult {
    pub purged: usize,
    pub data: NotesData,
}

pub fn normalize(mut data: NotesData, updated_at: &str) -> NotesData {
    data.schema_version = SCHEMA_VERSION;
    data.updated_at = updated_at.to_string();
    data
}

pub fn from_import(file: ImportFile, now: &str) -> NotesData {
    let mut groups = file.groups;
    let mut items = file.items;
    for mut g in file.trashed_groups {
        if g.deleted_at.is_none() {
            g.deleted_at = Some(now.to_string());
        }
        groups.push(g);
    }
    for mut i in file.trashed_items {
        if i.deleted_at.is_none() {
            i.deleted_at = Some(now.to_string());
        }
        items.push(i);
    }
    NotesData {
        schema_version: SCHEMA_VERSION,
        updated_at: now.to_string(),
        groups,
        items,
    }
}

fn ensure_uncategorized(groups: &mut Vec<Group>, now: &str) -> (String, bool) {
    if let Some(g) = groups
        .iter()
        .find(|g| g.deleted_at.is_none() && g.name == UNCATEGORIZED)
    {
        return (g.id.clone(), false);
    }
    let id = uuid::Uuid::new_v4().to_string();
    let order = groups.iter().map(|g| g.order).max().unwrap_or(-1) + 1;
    groups.push(Group {
        id: id.clone(),
        name: UNCATEGORIZED.to_string(),
        collapsed: false,
        order,
        created_at: now.to_string(),
        updated_at: now.to_string(),
        deleted_at: None,
    });
    (id, true)
}

pub fn merge(mut current: NotesData, imported: NotesData, now: &str) -> (NotesData, ImportSummary) {
    let mut summary = ImportSummary {
        mode: "merge".to_string(),
        groups_added: 0,
        items_added: 0,
        groups_kept: 0,
        items_kept: 0,
    };

    let mut group_ids: HashSet<String> = current.groups.iter().map(|g| g.id.clone()).collect();
    for g in imported.groups {
        if group_ids.contains(&g.id) {
            summary.groups_kept += 1;
            continue;
        }
        group_ids.insert(g.id.clone());
        current.groups.push(g);
        summary.groups_added += 1;
    }

    let active_group_ids: HashSet<String> = current
        .groups
        .iter()
        .filter(|g| g.deleted_at.is_none())
        .map(|g| g.id.clone())
        .collect();

    let mut item_ids: HashSet<String> = current.items.iter().map(|i| i.id.clone()).collect();
    for mut it in imported.items {
        if item_ids.contains(&it.id) {
            summary.items_kept += 1;
            continue;
        }
        if !active_group_ids.contains(&it.group_id) {
            let (gid, created) = ensure_uncategorized(&mut current.groups, now);
            if created {
                summary.groups_added += 1;
            }
            it.group_id = gid;
        }
        item_ids.insert(it.id.clone());
        current.items.push(it);
        summary.items_added += 1;
    }

    (current, summary)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ts() -> String {
        "2026-01-01T00:00:00Z".to_string()
    }

    fn group(id: &str, deleted: bool) -> Group {
        Group {
            id: id.to_string(),
            name: format!("group-{id}"),
            collapsed: false,
            order: 0,
            created_at: ts(),
            updated_at: ts(),
            deleted_at: deleted.then(|| ts()),
        }
    }

    fn item(id: &str, group_id: &str, deleted: bool) -> Item {
        Item {
            id: id.to_string(),
            group_id: group_id.to_string(),
            content: format!("content-{id}"),
            order: 0,
            created_at: ts(),
            updated_at: ts(),
            deleted_at: deleted.then(|| ts()),
        }
    }

    #[test]
    fn export_splits_trashed() {
        let data = NotesData {
            schema_version: 1,
            updated_at: ts(),
            groups: vec![group("g1", false), group("g2", true)],
            items: vec![item("i1", "g1", false), item("i2", "g2", true)],
        };
        let export = to_export(&data, ts());
        assert_eq!(export.groups.len(), 1);
        assert_eq!(export.trashed_groups.len(), 1);
        assert_eq!(export.items.len(), 1);
        assert_eq!(export.trashed_items.len(), 1);
    }

    #[test]
    fn merge_keeps_in_app_duplicates_and_adds_new() {
        let current = NotesData {
            schema_version: 1,
            updated_at: ts(),
            groups: vec![group("g1", false)],
            items: vec![item("i1", "g1", false)],
        };
        let imported = NotesData {
            schema_version: 1,
            updated_at: ts(),
            groups: vec![group("g1", false), group("g2", false)],
            items: vec![item("i1", "g1", false), item("i2", "g2", false)],
        };
        let (merged, summary) = merge(current, imported, &ts());
        assert_eq!(merged.groups.len(), 2);
        assert_eq!(merged.items.len(), 2);
        assert_eq!(summary.groups_added, 1);
        assert_eq!(summary.items_added, 1);
        assert_eq!(summary.groups_kept, 1);
        assert_eq!(summary.items_kept, 1);
        // Bản trong app được giữ nguyên
        assert_eq!(merged.items.iter().find(|i| i.id == "i1").unwrap().content, "content-i1");
    }

    #[test]
    fn merge_orphan_item_goes_to_uncategorized() {
        let current = NotesData::default();
        let imported = NotesData {
            schema_version: 1,
            updated_at: ts(),
            groups: vec![],
            items: vec![item("i1", "missing-group", false)],
        };
        let (merged, summary) = merge(current, imported, &ts());
        assert_eq!(merged.groups.len(), 1);
        assert_eq!(merged.groups[0].name, UNCATEGORIZED);
        assert_eq!(merged.items[0].group_id, merged.groups[0].id);
        assert_eq!(summary.groups_added, 1);
        assert_eq!(summary.items_added, 1);
    }

    #[test]
    fn from_import_marks_trashed_without_deleted_at() {
        let file = ImportFile {
            app: APP_NAME.to_string(),
            schema_version: 1,
            groups: vec![],
            items: vec![],
            trashed_groups: vec![Group { deleted_at: None, ..group("g9", false) }],
            trashed_items: vec![],
        };
        let data = from_import(file, &ts());
        assert_eq!(data.groups.len(), 1);
        assert!(data.groups[0].deleted_at.is_some());
    }
}
