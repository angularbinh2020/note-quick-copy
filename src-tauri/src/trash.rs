use chrono::{DateTime, Duration, Utc};

use crate::model::NotesData;

const TRASH_RETENTION_DAYS: i64 = 30;

fn is_expired(deleted_at: &Option<String>, cutoff: DateTime<Utc>) -> bool {
    match deleted_at {
        Some(s) => DateTime::parse_from_rfc3339(s)
            .map(|d| d.with_timezone(&Utc) < cutoff)
            .unwrap_or(false),
        None => false,
    }
}

/// Xóa vĩnh viễn mọi group/item đã nằm trong thùng rác quá 30 ngày.
/// Trả về số bản ghi bị xóa.
pub fn purge_expired(data: &mut NotesData, now: DateTime<Utc>) -> usize {
    let cutoff = now - Duration::days(TRASH_RETENTION_DAYS);
    let before = data.groups.len() + data.items.len();
    data.groups.retain(|g| !is_expired(&g.deleted_at, cutoff));
    data.items.retain(|i| !is_expired(&i.deleted_at, cutoff));
    before - data.groups.len() - data.items.len()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{Group, Item};

    fn iso(days_ago: i64) -> String {
        (Utc::now() - Duration::days(days_ago))
            .to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
    }

    fn group_deleted(days_ago: i64) -> Group {
        Group {
            id: "g1".into(),
            name: "g".into(),
            collapsed: false,
            order: 0,
            created_at: String::new(),
            updated_at: String::new(),
            deleted_at: Some(iso(days_ago)),
        }
    }

    fn item_deleted(days_ago: i64) -> Item {
        Item {
            id: "i1".into(),
            group_id: "g1".into(),
            content: "c".into(),
            order: 0,
            created_at: String::new(),
            updated_at: String::new(),
            deleted_at: Some(iso(days_ago)),
        }
    }

    #[test]
    fn purges_only_records_older_than_30_days() {
        let mut data = NotesData {
            schema_version: 1,
            updated_at: String::new(),
            groups: vec![group_deleted(31), group_deleted(29)],
            items: vec![item_deleted(40), item_deleted(1)],
        };
        let purged = purge_expired(&mut data, Utc::now());
        assert_eq!(purged, 2);
        assert_eq!(data.groups.len(), 1);
        assert_eq!(data.items.len(), 1);
    }

    #[test]
    fn keeps_active_records() {
        let mut data = NotesData {
            schema_version: 1,
            updated_at: String::new(),
            groups: vec![Group {
                deleted_at: None,
                ..group_deleted(100)
            }],
            items: vec![Item {
                deleted_at: None,
                ..item_deleted(100)
            }],
        };
        let purged = purge_expired(&mut data, Utc::now());
        assert_eq!(purged, 0);
        assert_eq!(data.groups.len(), 1);
        assert_eq!(data.items.len(), 1);
    }
}
