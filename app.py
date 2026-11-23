"""
app.py — Necroporra v2.1: plataforma profesional de gestión y seguimiento.
Incluye:
- Panel analítico con seguimiento temporal
- Comparativa 'Cara a Cara' entre jugadores
- Buscador y reutilización de candidatos al apostar
- Simulador de escenarios 'What-If'
- Generador de resúmenes listo para WhatsApp
- Control de fases y bloqueo de apuestas
"""

import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime, date
import database as db
from scoring import calculate_points_breakdown, calculate_base_points

# ─── Configuración de Página ────────────────────────────────────────────────
st.set_page_config(
    page_title="Necroporra",
    layout="wide",
    initial_sidebar_state="expanded",
)
db.init_db()

# ─── Estilos CSS ────────────────────────────────────────────────────────────
st.markdown("""<style>
/* Layout global */
section[data-testid="stSidebar"] > div:first-child { padding-top: 1.2rem; }
.block-container { padding-top: 1.6rem; padding-bottom: 2rem; }

/* Cabecera */
.app-header { margin-bottom: 1.8rem; }
.app-header h1 {
    font-size: 1.75rem; font-weight: 700; color: #f1f5f9;
    letter-spacing: -0.5px; margin: 0 0 .15rem 0;
}
.app-header p { font-size: .92rem; color: #64748b; margin: 0; }

/* Tarjetas */
.card {
    background: #111827; border: 1px solid rgba(255,255,255,.06);
    border-radius: 10px; padding: 1.1rem 1.25rem;
}
.card-sm {
    background: #111827; border: 1px solid rgba(255,255,255,.06);
    border-radius: 8px; padding: .85rem 1rem; margin-bottom: .6rem;
}

/* Podio */
.podium {
    background: #111827; border-radius: 10px; padding: 1.3rem;
    text-align: center; border: 1px solid rgba(255,255,255,.06);
    min-height: 155px;
}
.podium-gold   { border-top: 3px solid #eab308; }
.podium-silver { border-top: 3px solid #94a3b8; }
.podium-bronze { border-top: 3px solid #b45309; }
.podium .pos {
    font-size: .78rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 1.2px; color: #64748b; margin-bottom: .4rem;
}
.podium .name {
    font-size: 1.15rem; font-weight: 700; color: #f1f5f9; margin-bottom: .15rem;
}
.podium .pts {
    font-size: 1.7rem; font-weight: 800; color: #38bdf8; line-height: 1.1;
}
.podium .pts span { font-size: .85rem; font-weight: 400; color: #94a3b8; }
.podium .meta { font-size: .82rem; color: #64748b; margin-top: .35rem; }

/* Badges */
.tag {
    display: inline-block; padding: .12rem .5rem; font-size: .7rem;
    font-weight: 600; border-radius: 4px; letter-spacing: .4px;
    text-transform: uppercase; margin-right: .3rem; vertical-align: middle;
}
.tag-cap    { background: #92400e; color: #fde68a; }
.tag-dead   { background: #991b1b; color: #fca5a5; }
.tag-alive  { background: #064e3b; color: #6ee7b7; }
.tag-cat    { background: #1e293b; color: #94a3b8; border: 1px solid rgba(255,255,255,.08); }
.tag-bonus  { background: #312e81; color: #c4b5fd; }
.tag-lock   { background: #334155; color: #cbd5e1; }

/* Feed de defunciones */
.death-row {
    background: #111827; border-left: 3px solid #ef4444;
    border-radius: 0 8px 8px 0; padding: .85rem 1rem; margin-bottom: .6rem;
}
.death-row .name { font-weight: 700; color: #f1f5f9; font-size: 1rem; }
.death-row .detail { font-size: .85rem; color: #94a3b8; margin-top: .2rem; }
.death-row .pts-col {
    font-size: 1.15rem; font-weight: 700; color: #38bdf8; white-space: nowrap;
}

/* Tarjeta de apuesta */
.bet-row {
    background: #111827; border-left: 3px solid #334155;
    border-radius: 0 8px 8px 0; padding: .8rem 1rem; margin-bottom: .55rem;
}
.bet-row-cap  { border-left-color: #eab308; }
.bet-row-dead { border-left-color: #ef4444; background: #18101a; }

/* Simulador resultado */
.sim-result {
    background: #111827; border: 1px solid rgba(255,255,255,.06);
    border-radius: 10px; padding: 1.3rem 1.5rem;
}
.sim-result .total {
    font-size: 2.4rem; font-weight: 800; color: #38bdf8; line-height: 1;
}
.sim-result .total span { font-size: 1rem; color: #94a3b8; font-weight: 400; }
.sim-result .breakdown { font-size: .9rem; color: #cbd5e1; line-height: 1.9; margin-top: .8rem; }

/* Delta indicators */
.delta-up   { color: #10b981; font-weight: 700; }
.delta-down { color: #ef4444; font-weight: 700; }
.delta-same { color: #64748b; font-weight: 600; }

/* Progress bar */
.progress-track {
    width: 100%; height: 6px; background: #1e293b; border-radius: 3px; overflow: hidden;
}
.progress-fill { height: 100%; background: #c9a84c; border-radius: 3px; }

#MainMenu, footer, header { visibility: hidden; }
</style>""", unsafe_allow_html=True)


# ─── Funciones Auxiliares ───────────────────────────────────────────────────
def _header(title: str, subtitle: str = ""):
    h = f'<div class="app-header"><h1>{title}</h1>'
    if subtitle:
        h += f"<p>{subtitle}</p>"
    h += "</div>"
    st.markdown(h, unsafe_allow_html=True)


def _edition_progress(year: int) -> tuple[int, int]:
    today = date.today()
    start = date(year, 1, 1)
    end = date(year, 12, 31)
    total = (end - start).days
    elapsed = max(0, min(total, (today - start).days))
    return elapsed, total


def _is_edition_locked(edition_dict: dict) -> bool:
    """Verifica si la edición está cerrada para nuevas apuestas."""
    if edition_dict.get("is_active") == 0:
        return True
    lock_date_str = edition_dict.get("lock_date")
    if lock_date_str:
        try:
            lock_d = datetime.strptime(lock_date_str, "%Y-%m-%d").date()
            if date.today() > lock_d:
                return True
        except Exception:
            pass
    return False


# ─── Barra Lateral: Edición y Navegación ────────────────────────────────────
editions = db.list_editions()
if not editions:
    editions = [db.get_or_create_edition(2026, "Necroporra 2026")]

ed_map = {e["name"]: e for e in editions}
sel_ed_name = st.sidebar.selectbox("Edición Activa", list(ed_map.keys()))
edition = ed_map[sel_ed_name]
eid = edition["id"]
ed_year = edition["year"]
is_locked = _is_edition_locked(edition)

pages = [
    "Resumen",
    "Clasificación",
    "Apuestas",
    "Registro de Bajas",
    "Candidatos",
    "Reglas y Simulador",
    "Ajustes",
]
page = st.sidebar.radio("", pages, label_visibility="collapsed")

# Estado de la fase de apuestas
status_html = '<span class="tag tag-dead">Apuestas Cerradas</span>' if is_locked else '<span class="tag tag-alive">Apuestas Abiertas</span>'
st.sidebar.markdown(f"""
<div style="margin-top:0.8rem; font-size:.8rem; color:#94a3b8;">
    Fase: {status_html}
</div>
""", unsafe_allow_html=True)

# Progreso del año
elapsed, total = _edition_progress(ed_year)
pct = int(elapsed / total * 100) if total else 0
remaining = total - elapsed
st.sidebar.markdown(f"""
<div style="margin-top:1rem;">
    <div style="font-size:.78rem;color:#64748b;margin-bottom:.35rem;">
        Temporada {ed_year} — {remaining} días restantes
    </div>
    <div class="progress-track"><div class="progress-fill" style="width:{pct}%"></div></div>
</div>
""", unsafe_allow_html=True)
st.sidebar.caption("Necroporra v2.1")


# ═══════════════════════════════════════════════════════════════════════════
# 1. RESUMEN (Dashboard)
# ═══════════════════════════════════════════════════════════════════════════
if page == "Resumen":
    _header(f"Necroporra {ed_year}", "Panel analítico de seguimiento de la temporada")

    summary = db.get_edition_summary(eid)
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Participantes", summary["total_users"])
    c2.metric("Apuestas Registradas", summary["total_bets"])
    c3.metric("Bajas Confirmadas", summary["total_deaths"])
    c4.metric("Puntos Repartidos", summary["total_points"])

    st.write("")

    leaderboard = db.get_leaderboard(eid)
    if not leaderboard or summary["total_bets"] == 0:
        st.info("No hay apuestas registradas en esta edición. Carga datos de prueba en **Ajustes** o empieza en **Apuestas**.")
        st.stop()

    # GENERADOR DE RESUMEN PARA WHATSAPP
    with st.expander("📲 Generar Resumen Rápido para WhatsApp / Telegram"):
        today_str = date.today().strftime("%d/%m/%Y")
        lines = [
            f"⚰️ *NECROPORRA {ed_year} — CLASIFICACIÓN*",
            f"📅 _Actualizado a: {today_str}_\n",
        ]
        medals = ["🥇 1.", "🥈 2.", "🥉 3."]
        for idx, u in enumerate(leaderboard):
            rank_str = medals[idx] if idx < 3 else f"{idx+1}."
            cap_str = f", {u['captain_hits']} cap" if u["captain_hits"] > 0 else ""
            lines.append(f"{rank_str} *{u['display_name']}* — {u['total_points']} pts ({u['hits_count']} aciertos{cap_str})")

        # Bajas recientes
        deaths = db.get_deaths_grouped(eid)
        if deaths:
            lines.append("\n🕊️ *Últimas bajas confirmadas:*")
            for d in deaths[:3]:
                lines.append(f"• *{d['full_name']}* (+{d['total_points_given']} pts — {d['bettors']})")

        lines.append(f"\n⏳ Temporada: {remaining} días restantes ({pct}% transcurrido)")
        wa_text = "\n".join(lines)

        st.caption("Copia este bloque de texto con un solo clic y pégalo directamente en el grupo:")
        st.code(wa_text, language="text")

    st.write("")

    col_lb, col_feed = st.columns([3, 2], gap="large")

    with col_lb:
        st.markdown("##### Clasificación Actual")
        rows_html = ""
        for i, u in enumerate(leaderboard):
            bg = "rgba(201,168,76,.08)" if i == 0 else "transparent"
            fw = "700" if i < 3 else "400"
            rows_html += f"""
            <tr style="background:{bg};">
                <td style="padding:.55rem .6rem;color:#64748b;font-weight:600;">{i+1}</td>
                <td style="padding:.55rem .6rem;font-weight:{fw};color:#f1f5f9;">{u['display_name']}</td>
                <td style="padding:.55rem .6rem;font-weight:700;color:#38bdf8;text-align:right;">{u['total_points']}</td>
                <td style="padding:.55rem .6rem;color:#94a3b8;text-align:right;">{u['hits_count']}/{u['total_bets']}</td>
            </tr>"""

        st.markdown(f"""
        <table style="width:100%;border-collapse:collapse;font-size:.92rem;">
            <thead>
                <tr style="border-bottom:1px solid rgba(255,255,255,.08);">
                    <th style="padding:.5rem .6rem;text-align:left;color:#64748b;font-weight:600;font-size:.78rem;text-transform:uppercase;letter-spacing:.5px;">#</th>
                    <th style="padding:.5rem .6rem;text-align:left;color:#64748b;font-weight:600;font-size:.78rem;text-transform:uppercase;letter-spacing:.5px;">Participante</th>
                    <th style="padding:.5rem .6rem;text-align:right;color:#64748b;font-weight:600;font-size:.78rem;text-transform:uppercase;letter-spacing:.5px;">Puntos</th>
                    <th style="padding:.5rem .6rem;text-align:right;color:#64748b;font-weight:600;font-size:.78rem;text-transform:uppercase;letter-spacing:.5px;">Aciertos</th>
                </tr>
            </thead>
            <tbody>{rows_html}</tbody>
        </table>
        """, unsafe_allow_html=True)

    with col_feed:
        st.markdown("##### Últimas Bajas Confirmadas")
        deaths = db.get_deaths_grouped(eid)
        if not deaths:
            st.caption("Sin bajas confirmadas en esta edición.")
        else:
            for d in deaths[:5]:
                age = d.get("age_at_death", "?")
                pts = d.get("total_points_given", 0)
                base = calculate_base_points(age) if isinstance(age, int) else 0
                st.markdown(f"""
                <div class="death-row">
                    <div style="display:flex;justify-content:space-between;align-items:baseline;">
                        <span class="name">{d['full_name']}</span>
                        <span class="pts-col">+{pts} pts</span>
                    </div>
                    <div class="detail">
                        {d.get('death_date','')} · {age} años · Base {base} pts
                    </div>
                    <div class="detail">Acertaron: {d.get('bettors', '—')}</div>
                </div>""", unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════
# 2. CLASIFICACIÓN & CARA A CARA
# ═══════════════════════════════════════════════════════════════════════════
elif page == "Clasificación":
    _header("Clasificación", f"Tabla oficial de posiciones · {sel_ed_name}")

    leaderboard = db.get_leaderboard(eid)
    if not leaderboard:
        st.info("Sin datos de clasificación.")
        st.stop()

    # Podio top 3
    cols = st.columns(3)
    styles = [("1er puesto", "podium-gold"), ("2do puesto", "podium-silver"), ("3er puesto", "podium-bronze")]
    for i, (label, cls) in enumerate(styles):
        with cols[i]:
            if i < len(leaderboard):
                u = leaderboard[i]
                st.markdown(f"""
                <div class="podium {cls}">
                    <div class="pos">{label}</div>
                    <div class="name">{u['display_name']}</div>
                    <div class="pts">{u['total_points']} <span>pts</span></div>
                    <div class="meta">{u['hits_count']} aciertos · {u['total_bets']} apuestas</div>
                </div>""", unsafe_allow_html=True)
            else:
                st.markdown(f"""
                <div class="podium {cls}">
                    <div class="pos">{label}</div>
                    <div class="name" style="color:#475569;">—</div>
                    <div class="pts" style="color:#475569;">-</div>
                </div>""", unsafe_allow_html=True)

    st.write("")

    tab_table, tab_chart, tab_h2h = st.tabs(["Tabla Detallada", "Distribución Gráfica", "Cara a Cara (Comparativa)"])

    with tab_table:
        df = pd.DataFrame(leaderboard)
        df.insert(0, "#", range(1, len(df) + 1))
        df = df.rename(columns={
            "display_name": "Participante", "total_points": "Puntos",
            "hits_count": "Aciertos", "captain_hits": "Cap. Acertados",
            "total_bets": "Apuestas",
        })
        st.dataframe(
            df[["#", "Participante", "Puntos", "Aciertos", "Cap. Acertados", "Apuestas"]],
            use_container_width=True, hide_index=True,
        )

    with tab_chart:
        df_chart = pd.DataFrame(leaderboard).sort_values("total_points")
        fig = px.bar(
            df_chart, x="total_points", y="display_name", orientation="h",
            labels={"total_points": "Puntos", "display_name": ""},
            color_discrete_sequence=["#38bdf8"], template="plotly_dark",
        )
        fig.update_layout(
            margin=dict(l=0, r=20, t=10, b=10), height=max(200, len(df_chart) * 45),
            plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#94a3b8"),
        )
        st.plotly_chart(fig, use_container_width=True)

    with tab_h2h:
        st.markdown("##### Duelo Directo entre Dos Participantes")
        st.caption("Compara qué candidatos comparten y qué apuestas diferenciales pueden decidir la victoria.")

        users_list = db.list_users()
        user_opts = {u["display_name"]: u["id"] for u in users_list}

        if len(user_opts) >= 2:
            col_u1, col_u2 = st.columns(2)
            with col_u1:
                u1_sel = st.selectbox("Participante A", list(user_opts.keys()), index=0)
            with col_u2:
                u2_sel = st.selectbox("Participante B", list(user_opts.keys()), index=min(1, len(user_opts)-1))

            if u1_sel == u2_sel:
                st.warning("Selecciona dos participantes distintos para compararlos.")
            else:
                h2h = db.get_head_to_head(eid, user_opts[u1_sel], user_opts[u2_sel])

                m1, m2, m3 = st.columns(3)
                m1.metric("Diferencia de Puntos", f"{h2h['points_gap']} pts", delta=f"Líder: {h2h['leader']}")
                m2.metric(f"Edad Media {u1_sel}", f"{h2h['avg_age1']} años", help=h2h["profile1"])
                m3.metric(f"Edad Media {u2_sel}", f"{h2h['avg_age2']} años", help=h2h["profile2"])

                st.write("")
                col_c1, col_c2, col_c3 = st.columns(3)

                with col_c1:
                    st.markdown(f"**Coincidencias ({len(h2h['shared_bets'])})**")
                    st.caption("Candidatos en común (no aportan ventaja mutua):")
                    if not h2h["shared_bets"]:
                        st.write("Ninguna coincidencia.")
                    else:
                        for b in h2h["shared_bets"]:
                            status = "🕊️" if b["is_deceased"] else "⏳"
                            st.write(f"• {status} {b['full_name']} ({b['estimated_age']} años)")

                with col_c2:
                    st.markdown(f"**Exclusivos de {u1_sel} ({len(h2h['diff_user1'])})**")
                    st.caption(f"Apuestas que solo tiene {u1_sel}:")
                    if not h2h["diff_user1"]:
                        st.write("Sin candidatos diferenciales.")
                    else:
                        for b in h2h["diff_user1"]:
                            cap = "⭐ " if b["is_captain"] else ""
                            status = "🕊️" if b["is_deceased"] else "⏳"
                            pts_note = f"+{b['points_awarded']} pts" if b["is_deceased"] else f"~{calculate_base_points(b['estimated_age'])} pts"
                            st.write(f"• {cap}{status} {b['full_name']} ({pts_note})")

                with col_c3:
                    st.markdown(f"**Exclusivos de {u2_sel} ({len(h2h['diff_user2'])})**")
                    st.caption(f"Apuestas que solo tiene {u2_sel}:")
                    if not h2h["diff_user2"]:
                        st.write("Sin candidatos diferenciales.")
                    else:
                        for b in h2h["diff_user2"]:
                            cap = "⭐ " if b["is_captain"] else ""
                            status = "🕊️" if b["is_deceased"] else "⏳"
                            pts_note = f"+{b['points_awarded']} pts" if b["is_deceased"] else f"~{calculate_base_points(b['estimated_age'])} pts"
                            st.write(f"• {cap}{status} {b['full_name']} ({pts_note})")

    # Bajas confirmadas detalle
    st.write("")
    st.markdown("##### Historial de Aciertos")
    recent = db.get_recent_deaths(eid)
    if not recent:
        st.caption("Ningún candidato seleccionado ha fallecido.")
    else:
        for d in recent:
            tags = []
            if d["is_captain"]:
                tags.append('<span class="tag tag-cap">CAPITÁN ×2</span>')
            if d["is_first_blood"]:
                tags.append('<span class="tag tag-bonus">1er ACIERTO</span>')
            if d["is_exclusive"]:
                tags.append('<span class="tag tag-bonus">EXCLUSIVO</span>')
            if d["age_at_death"] < 55:
                tags.append('<span class="tag tag-bonus">JUVENTUD</span>')
            if d["age_at_death"] >= 100:
                tags.append('<span class="tag tag-bonus">CENTENARIO</span>')
            tags_html = " ".join(tags)

            st.markdown(f"""
            <div class="death-row">
                <div style="display:flex;justify-content:space-between;align-items:baseline;">
                    <div>
                        <span class="name">{d['full_name']}</span>
                        <span class="tag tag-cat">{d['category']}</span>
                    </div>
                    <span class="pts-col">+{d['points_awarded']} pts</span>
                </div>
                <div class="detail">
                    {d['death_date']} · {d['age_at_death']} años ·
                    Acertado por <strong>{d['winner_name']}</strong>
                </div>
                {f'<div class="detail"><em>{d["cause_or_source"]}</em></div>' if d.get("cause_or_source") else ''}
                <div style="margin-top:.35rem;">{tags_html}</div>
            </div>""", unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════
# 3. APUESTAS (Gestión de Roster & Buscador Inteligente)
# ═══════════════════════════════════════════════════════════════════════════
elif page == "Apuestas":
    _header("Gestión de Apuestas", "Administra la alineación de candidatos de cada participante")

    if is_locked:
        st.warning("🔒 **Fase de apuestas cerrada**: Las plantillas están congeladas para garantizar la competición limpia. Visualización en modo solo lectura.")

    users = db.list_users()

    # Nuevo participante (solo si no está cerrado)
    if not is_locked:
        with st.expander("Registrar Nuevo Participante", expanded=(len(users) == 0)):
            fc1, fc2, fc3 = st.columns([2, 3, 1])
            with fc1:
                new_user = st.text_input("Identificador", placeholder="ej. pablo")
            with fc2:
                new_name = st.text_input("Nombre", placeholder="ej. Pablo García")
            with fc3:
                st.write("")
                st.write("")
                if st.button("Registrar", use_container_width=True):
                    if new_user.strip() and new_name.strip():
                        try:
                            db.create_user(new_user.strip(), new_name.strip())
                            st.rerun()
                        except Exception as e:
                            st.error(f"Error: {e}")
                    else:
                        st.warning("Rellena ambos campos.")

    if not users:
        st.stop()

    # Selector de usuario
    user_map = {u["display_name"]: u["id"] for u in users}
    if "sel_user" not in st.session_state or st.session_state.sel_user not in user_map:
        st.session_state.sel_user = list(user_map.keys())[0]

    sel_user_name = st.selectbox(
        "Participante", list(user_map.keys()),
        index=list(user_map.keys()).index(st.session_state.sel_user),
        key="user_sel_box",
    )
    st.session_state.sel_user = sel_user_name
    uid = user_map[sel_user_name]

    bets = db.get_user_bets(uid, eid)
    max_bets = edition.get("max_bets_per_user", 10)
    has_cap = any(b["is_captain"] for b in bets)
    earned = sum(b["points_awarded"] for b in bets)

    # Resumen métricas
    m1, m2, m3 = st.columns(3)
    m1.metric("Candidatos Asignados", f"{len(bets)} / {max_bets}")
    m2.metric("Capitán Designado", "Confirmado (x2)" if has_cap else "Sin Asignar")
    m3.metric("Puntos Obtenidos", f"{earned} pts")

    st.divider()

    # Listado de apuestas actuales
    st.markdown("##### Plantilla Actual")
    if not bets:
        st.info("Sin candidatos registrados en la plantilla.")
    else:
        for bet in bets:
            is_cap = bool(bet["is_captain"])
            is_dec = bool(bet["is_deceased"])
            cls = "bet-row-dead" if is_dec else ("bet-row-cap" if is_cap else "")
            status = f'<span class="tag tag-dead">BAJA +{bet["points_awarded"]}pts</span>' if is_dec else '<span class="tag tag-alive">ACTIVO</span>'
            cap_tag = '<span class="tag tag-cap">CAPITÁN</span>' if is_cap else ""
            age_display = bet["age_at_death"] if is_dec else bet["estimated_age"]
            base_est = calculate_base_points(bet["estimated_age"])

            bc1, bc2 = st.columns([7, 2])
            with bc1:
                st.markdown(f"""
                <div class="bet-row {cls}">
                    <div>
                        <strong style="color:#f1f5f9;">{bet['full_name']}</strong>
                        {cap_tag} {status}
                        <span class="tag tag-cat">{bet['category']}</span>
                    </div>
                    <div style="font-size:.85rem;color:#94a3b8;margin-top:.2rem;">
                        {age_display} años{f' · ~{base_est} pts base' if not is_dec else ''}
                        {f' · <a href="{bet["wikipedia_url"]}" target="_blank" style="color:#38bdf8;">[ref]</a>' if bet.get("wikipedia_url") else ''}
                    </div>
                </div>""", unsafe_allow_html=True)
            with bc2:
                if not is_dec and not is_locked:
                    b1, b2 = st.columns(2)
                    with b1:
                        if not is_cap:
                            if st.button("Cap.", key=f"c_{bet['id']}", use_container_width=True,
                                         help="Designar como capitán"):
                                db.set_captain(bet["id"], uid, eid)
                                st.rerun()
                    with b2:
                        if st.button("Quitar", key=f"d_{bet['id']}", use_container_width=True):
                            db.delete_bet(bet["id"])
                            st.rerun()

    # Formulario para añadir candidatos (si no está cerrado)
    if not is_locked:
        st.write("")
        st.markdown("##### Añadir Candidato a la Plantilla")

        if len(bets) >= max_bets:
            st.warning(f"Has alcanzado el límite máximo permitido ({max_bets} candidatos).")
        else:
            bet_mode = st.radio(
                "Modo de selección:",
                ["Elegir del Directorio Existente", "Registrar Nueva Personalidad"],
                horizontal=True,
            )

            if bet_mode == "Elegir del Directorio Existente":
                available_cands = db.get_available_candidates_for_user(eid, uid)
                if not available_cands:
                    st.info("No hay candidatos activos en el directorio que no tengas ya en tu plantilla. Puedes dar de alta uno nuevo.")
                else:
                    cand_choices = {
                        f"{c['full_name']} — {c['estimated_age']} años ({c['category']}) · {c['global_bettors_count']} selecciones": c
                        for c in available_cands
                    }
                    selected_label = st.selectbox("Seleccionar personalidad existente:", list(cand_choices.keys()))
                    chosen_cand = cand_choices[selected_label]

                    col_p1, col_p2 = st.columns([3, 1])
                    with col_p1:
                        is_cap_existing = st.checkbox("Designar como Capitán (x2)", value=(not has_cap), key="cap_exist")
                    with col_p2:
                        add_btn = st.button("Añadir a mi plantilla", use_container_width=True)

                    prev_pts = calculate_points_breakdown(chosen_cand["estimated_age"], is_captain=is_cap_existing)
                    st.caption(f"Valor estimado: **{prev_pts['total_points']} pts** (base: {prev_pts['base_points']}{' + ' + str(prev_pts['captain_points']) + ' capitán' if is_cap_existing else ''}).")

                    if add_btn:
                        try:
                            db.place_bet(eid, uid, chosen_cand["id"], is_captain=is_cap_existing)
                            st.rerun()
                        except Exception as e:
                            st.error(f"Error al añadir: {e}")

            else:
                with st.form("add_bet_new", clear_on_submit=True):
                    r1c1, r1c2, r1c3 = st.columns([3, 1, 2])
                    with r1c1:
                        name = st.text_input("Nombre completo de la figura pública*", placeholder="ej. Mick Jagger")
                    with r1c2:
                        age = st.number_input("Edad actual*", 18, 120, 80)
                    with r1c3:
                        cat = st.selectbox("Categoría", [
                            "Cine", "Música", "Política", "Realeza", "Pensamiento",
                            "Deportes", "Empresa", "Entretenimiento", "Arte", "General",
                        ])

                    r2c1, r2c2 = st.columns([3, 1])
                    with r2c1:
                        wiki = st.text_input("Enlace de referencia (Wikipedia / noticia)", placeholder="https://es.wikipedia.org/wiki/...")
                    with r2c2:
                        as_cap = st.checkbox("Designar como Capitán (x2)", value=(not has_cap), key="cap_new")

                    prev = calculate_points_breakdown(age, is_captain=as_cap)
                    st.caption(f"Estimación: **{prev['total_points']} pts** si fallece a los {age} años (base {prev['base_points']}{' + ' + str(prev['captain_points']) + ' capitán' if as_cap else ''}).")

                    if st.form_submit_button("Guardar Candidato", use_container_width=True):
                        if not name.strip():
                            st.error("Indica el nombre de la personalidad.")
                        else:
                            cid = db.search_or_create_candidate(
                                name.strip(), age, cat,
                                wikipedia_url=wiki.strip() or None,
                            )
                            try:
                                db.place_bet(eid, uid, cid, is_captain=as_cap)
                                st.rerun()
                            except Exception as e:
                                st.error(f"Error al registrar la apuesta: {e}")


# ═══════════════════════════════════════════════════════════════════════════
# 4. REGISTRO DE BAJAS
# ═══════════════════════════════════════════════════════════════════════════
elif page == "Registro de Bajas":
    _header("Registro de Bajas", "Confirma defunciones y liquida puntuaciones automáticamente")

    candidates = db.list_candidates()
    alive = [c for c in candidates if not c["is_deceased"]]
    dead = [c for c in candidates if c["is_deceased"]]

    col_form, col_help = st.columns([3, 2], gap="large")

    with col_form:
        st.markdown("##### Registrar Defunción")
        if not alive:
            st.info("No hay candidatos activos en el sistema.")
        else:
            cand_map = {f"{c['full_name']} — {c['estimated_age']} años ({c['category']})": c for c in alive}
            sel = st.selectbox("Candidato", list(cand_map.keys()))
            cand = cand_map[sel]

            with st.form("death_form"):
                d_date = st.date_input("Fecha oficial de defunción", value=date.today())
                d_age = st.number_input("Edad al momento de la defunción", 1, 130, cand["estimated_age"])
                d_src = st.text_input("Fuente de la noticia", placeholder="ej. Reuters, EFE, El País, BBC")

                base = calculate_base_points(d_age)
                st.caption(f"Puntos base calculados: **{base}** (100 − {d_age})")

                if st.form_submit_button("Confirmar Defunción y Recalcular Puntos", use_container_width=True):
                    db.record_death(cand["id"], str(d_date), d_age, d_src or None)
                    st.success(f"Defunción de **{cand['full_name']}** registrada correctamente.")
                    st.rerun()

    with col_help:
        st.markdown("##### Reglas de Liquidación")
        st.markdown("""
        Cada deceso confirmado aplica los siguientes criterios automáticos:
        - **Puntos Base**: `max(1, 100 − edad)`.
        - **Capitán**: Duplica los puntos base (×2) para quien lo tuviera con el distintivo.
        - **Exclusividad**: +10 puntos si sólo un jugador apostó por el candidato.
        - **Primer Acierto del Año**: +10 puntos para la primera baja de la temporada.
        - **Bonus Juventud**: +15 puntos para personas menores de 55 años.
        - **Bonus Centenario**: +5 puntos para personas con 100 o más años.
        """)

    if dead:
        st.divider()
        st.markdown(f"##### Historial de Bajas Registradas ({len(dead)})")
        for d in dead:
            dc1, dc2 = st.columns([6, 1])
            with dc1:
                bp = calculate_base_points(d["age_at_death"])
                st.markdown(f"""
                <div class="card-sm">
                    <strong style="color:#f1f5f9;">{d['full_name']}</strong>
                    <span class="tag tag-cat">{d['category']}</span>
                    <span class="tag tag-dead">BASE {bp}pts</span><br>
                    <span style="font-size:.83rem;color:#94a3b8;">
                        {d['death_date']} · {d['age_at_death']} años
                        {f" · <em>{d['cause_or_source']}</em>" if d.get('cause_or_source') else ""}
                    </span>
                </div>""", unsafe_allow_html=True)
            with dc2:
                if st.button("Anular", key=f"undeath_{d['id']}", help="Eliminar baja por error"):
                    db.delete_death(d["id"])
                    st.rerun()


# ═══════════════════════════════════════════════════════════════════════════
# 5. CANDIDATOS
# ═══════════════════════════════════════════════════════════════════════════
elif page == "Candidatos":
    _header("Directorio de Candidatos", "Inventario y estadísticas de las personalidades seleccionadas")

    pop = db.get_candidate_popularity(eid)
    if not pop:
        st.info("Sin candidatos en esta edición.")
        st.stop()

    df = pd.DataFrame(pop)

    gc1, gc2 = st.columns(2)

    with gc1:
        st.markdown("##### Más Seleccionados en la Edición")
        top = df.nlargest(10, "bettor_count").sort_values("bettor_count")
        fig1 = px.bar(
            top, x="bettor_count", y="full_name", orientation="h",
            color="category",
            labels={"bettor_count": "Nº Selecciones", "full_name": "", "category": "Categoría"},
            template="plotly_dark",
        )
        fig1.update_layout(
            margin=dict(l=0, r=0, t=10, b=0), height=300,
            plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#94a3b8"), legend=dict(orientation="h", y=-0.2),
        )
        st.plotly_chart(fig1, use_container_width=True)

    with gc2:
        st.markdown("##### Distribución de Edades")
        fig2 = px.histogram(
            df, x="estimated_age", nbins=10,
            labels={"estimated_age": "Edad"},
            color_discrete_sequence=["#c9a84c"], template="plotly_dark",
        )
        fig2.update_layout(
            margin=dict(l=0, r=0, t=10, b=0), height=300,
            plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#94a3b8"),
        )
        st.plotly_chart(fig2, use_container_width=True)

    st.markdown("##### Listado Exhaustivo")
    df["Estado"] = df["is_deceased"].apply(lambda x: "Baja" if x else "Activo")
    df["Pts base"] = df["estimated_age"].apply(calculate_base_points)
    view = df[[
        "full_name", "category", "estimated_age", "Pts base",
        "bettor_count", "bettors_list", "Estado",
    ]].rename(columns={
        "full_name": "Nombre", "category": "Categoría",
        "estimated_age": "Edad", "bettor_count": "Selecciones",
        "bettors_list": "Apostado por",
    })
    st.dataframe(view, use_container_width=True, hide_index=True)


# ═══════════════════════════════════════════════════════════════════════════
# 6. REGLAS, CALCULADORA Y SIMULADOR WHAT-IF
# ═══════════════════════════════════════════════════════════════════════════
elif page == "Reglas y Simulador":
    _header("Reglas y Simulador", "Simulador de escenarios futuros, calculadora y normativa")

    tab_whatif, tab_calc, tab_rules = st.tabs([
        "Simulador 'What-If' (Escenarios)",
        "Calculadora de Puntos",
        "Normativa Oficial",
    ])

    # SIMULADOR DE ESCENARIOS WHAT-IF
    with tab_whatif:
        st.markdown("##### Proyección de Escenarios: '¿Qué pasaría si...?'")
        st.caption("Selecciona un candidato que sigue con vida y proyecta cómo cambiaría el podio y la clasificación si falleciera hoy.")

        # Obtener candidatos vivos que hayan sido apostados en esta edición
        pop_candidates = db.get_candidate_popularity(eid)
        alive_in_edition = [c for c in pop_candidates if not c["is_deceased"]]

        if not alive_in_edition:
            st.info("No hay candidatos activos en la edición para simular.")
        else:
            cand_options = {
                f"{c['full_name']} ({c['estimated_age']} años, {c['category']}) — {c['bettor_count']} apostantes: {c['bettors_list']}": c
                for c in alive_in_edition
            }
            sel_sim_cand_label = st.selectbox("Candidato a simular:", list(cand_options.keys()))
            sim_cand = cand_options[sel_sim_cand_label]

            col_s1, col_s2 = st.columns([1, 2])
            with col_s1:
                sim_age_input = st.number_input("Edad simulada al fallecer", 18, 120, sim_cand["estimated_age"])
                run_sim = st.button("Ejecutar Proyección 'What-If'", use_container_width=True)

            if run_sim:
                impact = db.simulate_death_impact(eid, sim_cand["id"], sim_age_input)

                st.write("")
                # Mensaje resumen
                gains_summary = []
                for uid, g in impact["gains"].items():
                    cap_tag = " [Capitán x2]" if g["is_captain"] else ""
                    gains_summary.append(f"**{g['display_name']}** (+{g['points_gained']} pts{cap_tag})")

                gains_text = ", ".join(gains_summary) if gains_summary else "Nadie sumaría puntos."
                st.info(f"💡 **Impacto Proyectado**: Si **{sim_cand['full_name']}** falleciera a los {sim_age_input} años, {gains_text}.")

                # Tabla comparativa de antes y después
                sim_df = pd.DataFrame(impact["simulated_leaderboard"])

                def format_delta(d):
                    if d > 0:
                        return f"▲ +{d}"
                    elif d < 0:
                        return f"▼ {d}"
                    else:
                        return "="

                sim_df["Evolución"] = sim_df["rank_delta"].apply(format_delta)
                sim_df["Puesto"] = sim_df["new_rank"]
                sim_df["Participante"] = sim_df["display_name"]
                sim_df["Puntos Simulados"] = sim_df.apply(
                    lambda r: f"{r['total_points']} (+{r['points_gained']})" if r['points_gained'] > 0 else f"{r['total_points']}",
                    axis=1,
                )
                sim_df["Aciertos Simulados"] = sim_df["hits_count"]

                view_sim = sim_df[["Puesto", "Evolución", "Participante", "Puntos Simulados", "Aciertos Simulados"]]
                st.dataframe(view_sim, use_container_width=True, hide_index=True)

    # CALCULADORA TRADICIONAL
    with tab_calc:
        sc1, sc2 = st.columns([1, 1], gap="large")
        with sc1:
            st.markdown("##### Parámetros Teóricos")
            sim_age = st.slider("Edad al fallecer", 18, 115, 78)
            sim_cap = st.checkbox("Capitán (×2 puntos base)")
            sim_exc = st.checkbox("Acierto exclusivo (+10)")
            sim_fb = st.checkbox("Primer acierto del año (+10)")

        with sc2:
            r = calculate_points_breakdown(sim_age, sim_cap, sim_exc, sim_fb)
            st.markdown(f"""
            <div class="sim-result">
                <div class="total">{r['total_points']} <span>puntos</span></div>
                <div class="breakdown">
                    Puntos base (100 − {sim_age}): <strong>{r['base_points']}</strong><br>
                    Multiplicador capitán: <strong>+{r['captain_points']}</strong><br>
                    Bonificación exclusividad: <strong>+{r['bonus_exclusive']}</strong><br>
                    Bonificación 1er acierto: <strong>+{r['bonus_first_blood']}</strong><br>
                    Bonificación juventud (&lt;55): <strong>+{r['bonus_youth']}</strong><br>
                    Bonificación centenario (&ge;100): <strong>+{r['bonus_centenarian']}</strong>
                </div>
            </div>""", unsafe_allow_html=True)

    # REGLAS OFICIALES
    with tab_rules:
        st.markdown("""
### 1. Objetivo y Filosofía
Cada participante pronostica qué personalidades públicas fallecerán durante el año natural correspondiente. Gana quien acumule más puntos al cierre de la temporada (31 de diciembre).

El sistema equilibra matemáticamente **probabilidad** y **riesgo**: pronosticar a personas jóvenes aporta recompensas mayores que a personas centenarias.

### 2. Formato y Fases
- Cada edición establece un **número máximo de candidatos** por participante (por defecto, 10).
- **Fase de Apuestas**: Plazo inicial donde cada participante configura su plantilla y nombra su Capitán.
- **Cierre de Apuestas (Lock Date)**: Pasada la fecha límite, la porra entra en fase de competición estricta en modo solo lectura.
- **Capitán**: Cada participante puede designar a un único candidato como Capitán (puntos base ×2 en caso de acierto).

### 3. Criterios de Elegibilidad
- **Figuras Públicas**: Relevancia social, cultural, científica, política o deportiva demostrable en fuentes de información independientes (Wikipedia, prensa).
- **Exclusiones**: Personas condenadas a pena capital con fecha firme de ejecución.
- **Existencia Real**: Personas físicas vivas al inicio de la edición.

### 4. Fórmula de Puntuación
$$\\text{Puntos Base} = \\max(1,\\; 100 - \\text{edad al fallecer})$$

| Edad al fallecer | Puntos base |
|---|---|
| 95 años | **5 pts** |
| 80 años | **20 pts** |
| 65 años | **35 pts** |
| 50 años | **50 pts** |
| 100+ años | **1 pt** (+5 bono centenario) |

### 5. Bonificaciones
- **Capitán**: ×2 sobre los puntos base.
- **Exclusividad (+10 pts)**: Si ningún otro participante seleccionó al candidato en la edición.
- **Primer Acierto del Año (+10 pts)**: Primer deceso cronológico confirmado de la temporada.
- **Bonus Juventud (+15 pts)**: Personas que fallezcan con menos de 55 años.
- **Bonus Centenario (+5 pts)**: Personas que alcancen o superen los 100 años.

### 6. Desempates
1. Mayor número de aciertos totales.
2. Mayor número de aciertos de capitán.
3. Orden alfabético del participante.
        """)


# ═══════════════════════════════════════════════════════════════════════════
# 7. AJUSTES (Exportación, Fases y Mantenimiento)
# ═══════════════════════════════════════════════════════════════════════════
elif page == "Ajustes":
    _header("Ajustes del Sistema", "Gestión de fechas límite, fases de la porra y mantenimiento")

    col_cfg, col_data = st.columns(2, gap="large")

    with col_cfg:
        st.markdown("##### Control de Fases y Edición")
        with st.form("form_edition_cfg"):
            ed_name_input = st.text_input("Nombre de la edición", value=edition["name"])
            max_bets_input = st.number_input("Máximo de candidatos por participante", 3, 25, edition.get("max_bets_per_user", 10))
            
            # Fecha límite
            current_lock = edition.get("lock_date")
            use_lock = st.checkbox("Activar fecha límite de apuestas (Lock Date)", value=(current_lock is not None))
            
            default_lock_val = datetime.strptime(current_lock, "%Y-%m-%d").date() if current_lock else date.today()
            lock_date_input = st.date_input("Fecha límite para realizar apuestas", value=default_lock_val)
            
            manual_close = st.checkbox("Cerrar apuestas manualmente ahora (Modo Solo Lectura)", value=(edition.get("is_active") == 0))

            if st.form_submit_button("Guardar Configuración de la Edición", use_container_width=True):
                new_lock_str = str(lock_date_input) if use_lock else None
                new_active_val = 0 if manual_close else 1
                db.update_edition(
                    edition_id=eid,
                    name=ed_name_input.strip(),
                    lock_date=new_lock_str,
                    is_active=new_active_val,
                    max_bets=max_bets_input,
                )
                st.success("Configuración actualizada.")
                st.rerun()

        st.write("")
        st.markdown("##### Exportación de Datos")
        lb = db.get_leaderboard(eid)
        if lb:
            csv = pd.DataFrame(lb).to_csv(index=False).encode("utf-8")
            st.download_button(
                "Descargar Clasificación (CSV)", csv,
                f"clasificacion_{ed_year}.csv", "text/csv",
                use_container_width=True,
            )

        cp = db.get_candidate_popularity(eid)
        if cp:
            csv2 = pd.DataFrame(cp).to_csv(index=False).encode("utf-8")
            st.download_button(
                "Descargar Directorio de Candidatos (CSV)", csv2,
                f"candidatos_{ed_year}.csv", "text/csv",
                use_container_width=True,
            )

    with col_data:
        st.markdown("##### Datos de Demostración")
        st.write("Reinicia la base de datos y carga un conjunto completo con 5 participantes, 20 figuras públicas reales y 3 bajas confirmadas.")
        if st.button("Cargar Datos de Demostración", use_container_width=True):
            import seed_data
            seed_data.populate_demo_data(reset_first=True)
            st.success("Datos de prueba cargados con éxito.")
            st.rerun()

        st.write("")
        st.markdown("##### Zona de Mantenimiento")
        st.caption("Esta acción vacía todos los participantes, apuestas y defunciones.")
        if st.button("Restablecer Base de Datos a Cero", use_container_width=True, type="secondary"):
            db.reset_db()
            st.warning("Base de datos restablecida a cero.")
            st.rerun()
