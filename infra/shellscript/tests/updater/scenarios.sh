#!/usr/bin/env bash
# Cenarios do updater. Cada funcao sNN_* e um cenario, e o nome diz o que se espera.

s01_first_install_good_release() {
    reset_world
    make_release v1.0.0 good
    set_latest v1.0.0
    run_updater
    check "versao gravada" "v1.0.0" "$(installed_version)"
    check "binario instalado" "GOOD v1.0.0" "$(binary_id)"
    check "servico saudavel" "healthy" "$(service_state)"
    check "terminou sem erro" "zero" "$(exit_kind)"
}

s02_update_to_good_release() {
    reset_world
    seed_installed v1.0.0 good
    make_release v1.1.0 good
    set_latest v1.1.0
    run_updater
    check "versao gravada" "v1.1.0" "$(installed_version)"
    check "binario novo" "GOOD v1.1.0" "$(binary_id)"
    check "servico saudavel" "healthy" "$(service_state)"
    check "terminou sem erro" "zero" "$(exit_kind)"
}

s03_update_to_bad_release_rolls_back() {
    reset_world
    seed_installed v1.0.0 good
    make_release v1.1.0 bad
    set_latest v1.1.0
    run_updater
    check "binario anterior restaurado" "GOOD v1.0.0" "$(binary_id)"
    check "versao gravada continua a anterior" "v1.0.0" "$(installed_version)"
    check "servico volta a responder" "healthy" "$(service_state)"
    check "rollback que deu certo termina sem erro" "zero" "$(exit_kind)"
}

s04_no_new_release_changes_nothing() {
    reset_world
    seed_installed v1.0.0 good
    make_release v1.0.0 good
    set_latest v1.0.0
    run_updater
    check "nenhum download" "0" "$(download_count v1.0.0)"
    check "nenhum restart" "0" "$(restart_count)"
    check "versao intacta" "v1.0.0" "$(installed_version)"
    check "terminou sem erro" "zero" "$(exit_kind)"
}

s05_tampered_checksum_aborts_without_changes() {
    reset_world
    seed_installed v1.0.0 good
    make_release v1.1.0 good
    tamper_release v1.1.0
    set_latest v1.1.0
    run_updater
    check "versao intacta" "v1.0.0" "$(installed_version)"
    check "binario intacto" "GOOD v1.0.0" "$(binary_id)"
    check "nenhum restart" "0" "$(restart_count)"
    check "terminou com erro" "erro" "$(exit_kind)"
}

s06_bad_release_is_not_retried_in_a_loop() {
    reset_world
    seed_installed v1.0.0 good
    make_release v1.1.0 bad
    set_latest v1.1.0
    run_updater
    run_updater
    check "2a execucao nao baixa a versao ruim" "0" "$(download_count v1.1.0)"
    check "2a execucao nao reinicia" "0" "$(restart_count)"
    check "continua no binario anterior" "GOOD v1.0.0" "$(binary_id)"
    check "servico saudavel" "healthy" "$(service_state)"
}

s07_newer_release_after_a_bad_one_is_installed() {
    reset_world
    seed_installed v1.0.0 good
    make_release v1.1.0 bad
    set_latest v1.1.0
    run_updater
    make_release v1.2.0 good
    set_latest v1.2.0
    run_updater
    check "baixou a release nova" "1" "$(download_count v1.2.0)"
    check "versao gravada" "v1.2.0" "$(installed_version)"
    check "binario novo" "GOOD v1.2.0" "$(binary_id)"
    check "servico saudavel" "healthy" "$(service_state)"
}

s09_unrelated_failure_does_not_downgrade_a_good_binary() {
    reset_world
    seed_installed v1.0.0 good
    printf 'GOOD v0.9.0\n' >"$BIN.prev"        # sobra de uma atualizacao antiga
    make_release v1.0.0 good
    set_latest v1.0.0
    echo crashed >"$WORLD/state/service"      # o servico esta fora do ar...
    : >"$WORLD/state/force_unhealthy"         # ...por um motivo que nao e o binario
    run_updater
    check "binario atual nao foi rebaixado" "GOOD v1.0.0" "$(binary_id)"
    check "versao gravada intacta" "v1.0.0" "$(installed_version)"
    check "falha sem troca de versao termina com erro" "erro" "$(exit_kind)"
}

s08_first_install_bad_release_is_not_recorded() {
    reset_world
    make_release v1.0.0 bad
    set_latest v1.0.0
    run_updater
    check "nenhuma versao gravada" "(nenhuma)" "$(installed_version)"
    check "terminou com erro" "erro" "$(exit_kind)"
}
